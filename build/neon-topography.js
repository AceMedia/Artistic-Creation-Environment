// Neon Topography — WebGL GLSL animated iso-contour lines on a noise field.
// Pointer shifts the noise field centre; lines glow in neon palettes.
(function () {
	'use strict';

	var VERT_SRC = 'attribute vec2 a_pos;void main(){gl_Position=vec4(a_pos,0.0,1.0);}';

	var FRAG_SRC = [
		'precision mediump float;',
		'uniform vec2  u_res;',
		'uniform float u_time;',
		'uniform vec2  u_pointer;',
		'uniform float u_speed;',
		'uniform float u_line_density;',
		'uniform int   u_scheme;', // 0=cyan 1=magenta 2=gold
		'uniform float u_pointer_influence;',
		'uniform float u_glow;',

		// 2D simplex noise
		'vec3 mod289v3(vec3 x){return x-floor(x*(1./289.))*289.;}',
		'vec2 mod289v2(vec2 x){return x-floor(x*(1./289.))*289.;}',
		'vec3 permute(vec3 x){return mod289v3(((x*34.)+1.)*x);}',
		'float snoise(vec2 v){',
		'  const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);',
		'  vec2 i=floor(v+dot(v,C.yy));',
		'  vec2 x0=v-i+dot(i,C.xx);',
		'  vec2 i1=x0.x>x0.y?vec2(1.,0.):vec2(0.,1.);',
		'  vec4 x12=x0.xyxy+C.xxzz; x12.xy-=i1;',
		'  i=mod289v2(i);',
		'  vec3 p=permute(permute(i.y+vec3(0.,i1.y,1.))+i.x+vec3(0.,i1.x,1.));',
		'  vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.);',
		'  m=m*m; m=m*m;',
		'  vec3 x2=2.*fract(p*C.www)-1.;',
		'  vec3 h=abs(x2)-0.5;',
		'  vec3 ox=floor(x2+0.5);',
		'  vec3 a0=x2-ox;',
		'  m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);',
		'  vec3 g; g.x=a0.x*x0.x+h.x*x0.y; g.yz=a0.yz*x12.xz+h.yz*x12.yw;',
		'  return 130.*dot(m,g);',
		'}',
		'float fbm(vec2 p){float v=0.,a=0.5;for(int i=0;i<6;i++){v+=a*snoise(p);p*=2.;a*=0.5;}return v;}',

		'vec3 neonColor(float t,int scheme){',
		'  t=fract(t+0.5);',
		'  if(scheme==1){return mix(vec3(1.,0.08,0.62),vec3(0.62,0.,1.),t);}', // magenta→violet
		'  if(scheme==2){return mix(vec3(1.,0.72,0.),vec3(1.,0.35,0.),t);}',   // gold→orange
		'  return mix(vec3(0.,0.92,1.),vec3(0.2,1.,0.55),t);',                 // cyan→mint
		'}',

		'void main(){',
		'  vec2 uv=(gl_FragCoord.xy/u_res)*2.-1.;',
		'  uv.x*=u_res.x/u_res.y;',

		// pointer shift
		'  vec2 ptr=(u_pointer*2.-1.);',
		'  ptr.x*=u_res.x/u_res.y;',
		'  uv+=ptr*u_pointer_influence*0.4;',

		'  float t=u_time*u_speed*0.12;',
		'  float field=fbm(uv*1.8+vec2(t,t*0.71));',

		// iso-contour lines
		'  float lines=field*u_line_density;',
		'  float fw=fwidth(lines)*1.5;',
		'  float edge=abs(fract(lines)-0.5);',
		'  float lineAlpha=1.-smoothstep(fw,fw*2.,edge);',

		// glow halo
		'  float glowAlpha=(1.-smoothstep(fw*2.,fw*12.,edge))*u_glow*0.4;',

		'  float tColor=fract(field*0.5+0.5);',
		'  vec3 lineCol=neonColor(tColor,u_scheme);',
		'  vec3 col=(lineCol*(lineAlpha+glowAlpha));',

		// very dark background with subtle gradient
		'  col=mix(vec3(0.01,0.01,0.04),col,clamp(lineAlpha+glowAlpha,0.,1.));',
		'  gl_FragColor=vec4(col,1.);',
		'}',
	].join('\n');

	function buildGL(gl, vertSrc, fragSrc) {
		function mkShader(type, src) {
			var s = gl.createShader(type);
			gl.shaderSource(s, src);
			gl.compileShader(s);
			return s;
		}
		var prog = gl.createProgram();
		gl.attachShader(prog, mkShader(gl.VERTEX_SHADER, vertSrc));
		gl.attachShader(prog, mkShader(gl.FRAGMENT_SHADER, fragSrc));
		gl.linkProgram(prog);
		return prog;
	}

	var SCHEME_MAP = { cyan: 0, magenta: 1, gold: 2 };

	function createAceNeonTopography(rootElement, initialConfig, options) {
		var root = rootElement && rootElement.querySelector ? rootElement : document.body;
		var runtimeOptions = options || {};
		var interactionSurface = runtimeOptions.interactionSurface && runtimeOptions.interactionSurface.addEventListener
			? runtimeOptions.interactionSurface : root;

		var canvas = root.querySelector('canvas');
		if (!canvas) { canvas = document.createElement('canvas'); canvas.className = 'artistic-creative__canvas'; root.appendChild(canvas); }

		var gl = canvas.getContext('webgl', { antialias: true }) || canvas.getContext('experimental-webgl');
		if (!gl || !gl.getExtension('OES_standard_derivatives')) {
			return { applyConfig: function () {}, destroy: function () {}, setPaused: function () {} };
		}
		gl.getExtension('OES_standard_derivatives');

		var FRAG_WITH_EXT = '#extension GL_OES_standard_derivatives : enable\n' + FRAG_SRC;
		var program = buildGL(gl, VERT_SRC, FRAG_WITH_EXT);

		var buf = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buf);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);

		var aPos = gl.getAttribLocation(program, 'a_pos');
		var uRes = gl.getUniformLocation(program, 'u_res');
		var uTime = gl.getUniformLocation(program, 'u_time');
		var uPointer = gl.getUniformLocation(program, 'u_pointer');
		var uSpeed = gl.getUniformLocation(program, 'u_speed');
		var uLineDensity = gl.getUniformLocation(program, 'u_line_density');
		var uScheme = gl.getUniformLocation(program, 'u_scheme');
		var uPointerInfluence = gl.getUniformLocation(program, 'u_pointer_influence');
		var uGlow = gl.getUniformLocation(program, 'u_glow');

		var config = { SPEED: 1.0, LINE_DENSITY: 8.0, COLOR_SCHEME: 'cyan', POINTER_INFLUENCE: 0.6, GLOW: 1.0, BACKGROUND_COLOR: '#010108', PAUSED: false };
		var pointer = { x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5 };
		var frameHandle = 0;
		var destroyed = false;

		function resize() {
			var w = root.offsetWidth || 640;
			var h = root.offsetHeight || 360;
			if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
		}

		function render(time) {
			if (destroyed || config.PAUSED) { frameHandle = requestAnimationFrame(render); return; }
			resize();
			pointer.x += (pointer.targetX - pointer.x) * 0.06;
			pointer.y += (pointer.targetY - pointer.y) * 0.06;

			gl.useProgram(program);
			gl.bindBuffer(gl.ARRAY_BUFFER, buf);
			gl.enableVertexAttribArray(aPos);
			gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

			gl.uniform2f(uRes, canvas.width, canvas.height);
			gl.uniform1f(uTime, time * 0.001);
			gl.uniform2f(uPointer, pointer.x, pointer.y);
			gl.uniform1f(uSpeed, config.SPEED);
			gl.uniform1f(uLineDensity, config.LINE_DENSITY);
			gl.uniform1i(uScheme, SCHEME_MAP[config.COLOR_SCHEME] || 0);
			gl.uniform1f(uPointerInfluence, config.POINTER_INFLUENCE);
			gl.uniform1f(uGlow, config.GLOW);

			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
			frameHandle = requestAnimationFrame(render);
		}

		function applyAceConfig(cfg) {
			if (!cfg) { return; }
			if (cfg.topoSpeed !== undefined && cfg.topoSpeed !== null) { config.SPEED = parseFloat(cfg.topoSpeed) || config.SPEED; }
			if (cfg.topoLineDensity !== undefined && cfg.topoLineDensity !== null) { config.LINE_DENSITY = parseFloat(cfg.topoLineDensity) || config.LINE_DENSITY; }
			if (cfg.topoColorScheme) { config.COLOR_SCHEME = cfg.topoColorScheme; }
			if (cfg.topoPointerInfluence !== undefined && cfg.topoPointerInfluence !== null) { config.POINTER_INFLUENCE = parseFloat(cfg.topoPointerInfluence); }
			if (cfg.topoGlow !== undefined && cfg.topoGlow !== null) { config.GLOW = parseFloat(cfg.topoGlow); }
			if (cfg.backgroundColor) { config.BACKGROUND_COLOR = cfg.backgroundColor; root.style.background = cfg.backgroundColor; }
		}

		function onPointerMove(e) {
			var rect = interactionSurface.getBoundingClientRect();
			pointer.targetX = ((e.touches ? e.touches[0].clientX : e.clientX) - rect.left) / rect.width;
			pointer.targetY = 1.0 - ((e.touches ? e.touches[0].clientY : e.clientY) - rect.top) / rect.height;
		}
		function onMessage(e) {
			if (!e.data || e.data.type !== 'artistic-creation-environment-preview') { return; }
			applyAceConfig(e.data.config || {});
		}

		var sp = new URLSearchParams(window.location.search);
		applyAceConfig({ topoSpeed: sp.get('topoSpeed'), topoLineDensity: sp.get('topoLineDensity'), topoColorScheme: sp.get('topoColorScheme'), topoPointerInfluence: sp.get('topoPointerInfluence'), topoGlow: sp.get('topoGlow'), backgroundColor: sp.get('backgroundColor') });
		applyAceConfig(initialConfig || {});

		root.style.background = config.BACKGROUND_COLOR;
		window.addEventListener('message', onMessage);
		interactionSurface.addEventListener('mousemove', onPointerMove, true);
		interactionSurface.addEventListener('touchmove', onPointerMove, { passive: true, capture: true });

		frameHandle = requestAnimationFrame(render);

		return {
			applyConfig: applyAceConfig,
			destroy: function () {
				if (destroyed) { return; }
				destroyed = true;
				if (frameHandle) { cancelAnimationFrame(frameHandle); frameHandle = 0; }
				window.removeEventListener('message', onMessage);
				interactionSurface.removeEventListener('mousemove', onPointerMove, true);
				interactionSurface.removeEventListener('touchmove', onPointerMove, true);
				gl.deleteProgram(program);
				gl.deleteBuffer(buf);
			},
			setPaused: function (p) { config.PAUSED = !!p; },
		};
	}

	window.ArtisticCreationEnvironmentTopo = createAceNeonTopography;

	if (document.body && document.body.getAttribute('data-artistic-topo-preview') === '1') {
		window.ArtisticCreationEnvironmentTopo(document.body);
	}
})();
