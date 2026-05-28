// Glass Caustics — WebGL GLSL animated Voronoi caustic light patterns.
// Simulates refracted light through water or cut glass. Pointer shifts the light source.
(function () {
	'use strict';

	var VERT_SRC = 'attribute vec2 a_pos;void main(){gl_Position=vec4(a_pos,0.,1.);}';

	var FRAG_SRC = [
		'precision mediump float;',
		'uniform vec2  u_res;',
		'uniform float u_time;',
		'uniform vec2  u_pointer;',
		'uniform float u_speed;',
		'uniform float u_refraction;',
		'uniform int   u_color_temp;', // 0=cool 1=warm 2=neutral
		'uniform float u_pointer_influence;',
		'uniform float u_brightness;',

		// Hash / Voronoi helpers
		'vec2 hash2(vec2 p){',
		'  p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));',
		'  return fract(sin(p)*43758.5453123);',
		'}',

		'float voronoi(vec2 p,float time){',
		'  vec2 ip=floor(p);',
		'  vec2 fp=fract(p);',
		'  float minDist=8.;',
		'  for(int y=-1;y<=1;y++){',
		'    for(int x=-1;x<=1;x++){',
		'      vec2 n=vec2(float(x),float(y));',
		'      vec2 g=hash2(ip+n);',
		'      g=0.5+0.5*sin(time+6.2831*g);',
		'      vec2 r=n+g-fp;',
		'      minDist=min(minDist,dot(r,r));',
		'    }',
		'  }',
		'  return sqrt(minDist);',
		'}',

		'vec3 causticColor(float v, int ct){',
		'  v=clamp(v,0.,1.);',
		'  if(ct==1){return mix(vec3(0.95,0.52,0.06),mix(vec3(1.,0.85,0.2),vec3(1.,1.,0.9),v),v);}', // warm gold
		'  if(ct==2){return mix(vec3(0.6,0.6,0.75),mix(vec3(0.85,0.9,0.95),vec3(1.,1.,1.),v),v);}', // neutral silver
		'  return mix(vec3(0.0,0.3,0.62),mix(vec3(0.12,0.72,0.9),vec3(0.88,0.97,1.),v),v);',        // cool aqua
		'}',

		'void main(){',
		'  vec2 uv=gl_FragCoord.xy/u_res;',
		'  uv.x*=u_res.x/u_res.y;',

		// light source offset by pointer
		'  vec2 lightPos=vec2(0.5*u_res.x/u_res.y,0.5);',
		'  lightPos+=((u_pointer-vec2(0.5))*2.)*u_pointer_influence*0.4;',

		'  float t=u_time*u_speed;',

		// multi-layer caustics
		'  float v1=voronoi(uv*5.2*u_refraction+lightPos*0.5,t*0.8);',
		'  float v2=voronoi(uv*8.5*u_refraction-lightPos*0.3,t*1.1+1.3);',
		'  float v3=voronoi(uv*3.8*u_refraction+lightPos*0.7,t*0.6+2.5);',

		// caustic band: bright edge where voronoi cells meet
		'  float c1=pow(1.-clamp(v1,0.,1.),5.)*1.8;',
		'  float c2=pow(1.-clamp(v2,0.,1.),4.)*1.2;',
		'  float c3=pow(1.-clamp(v3,0.,1.),6.)*0.9;',
		'  float caustic=(c1+c2+c3)*u_brightness;',

		'  vec3 col=causticColor(clamp(caustic*0.6,0.,1.),u_color_temp)*caustic;',

		// dark base
		'  col=mix(vec3(0.01,0.01,0.03),col,clamp(caustic,0.,1.));',
		'  col=pow(clamp(col,0.,1.),vec3(0.9));',
		'  gl_FragColor=vec4(col,1.);',
		'}',
	].join('\n');

	function mkShader(gl, type, src) {
		var s = gl.createShader(type);
		gl.shaderSource(s, src);
		gl.compileShader(s);
		return s;
	}

	var COLOR_TEMP_MAP = { cool: 0, warm: 1, neutral: 2 };

	function createAceCaustics(rootElement, initialConfig, options) {
		var root = rootElement && rootElement.querySelector ? rootElement : document.body;
		var runtimeOptions = options || {};
		var interactionSurface = runtimeOptions.interactionSurface && runtimeOptions.interactionSurface.addEventListener
			? runtimeOptions.interactionSurface : root;

		var canvas = root.querySelector('canvas');
		if (!canvas) { canvas = document.createElement('canvas'); canvas.className = 'artistic-creative__canvas'; root.appendChild(canvas); }

		var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
		if (!gl) { return { applyConfig: function () {}, destroy: function () {}, setPaused: function () {} }; }

		var prog = gl.createProgram();
		gl.attachShader(prog, mkShader(gl, gl.VERTEX_SHADER, VERT_SRC));
		gl.attachShader(prog, mkShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC));
		gl.linkProgram(prog);

		var buf = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buf);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);

		var aPos = gl.getAttribLocation(prog, 'a_pos');
		var uRes = gl.getUniformLocation(prog, 'u_res');
		var uTime = gl.getUniformLocation(prog, 'u_time');
		var uPointer = gl.getUniformLocation(prog, 'u_pointer');
		var uSpeed = gl.getUniformLocation(prog, 'u_speed');
		var uRefraction = gl.getUniformLocation(prog, 'u_refraction');
		var uColorTemp = gl.getUniformLocation(prog, 'u_color_temp');
		var uPointerInfluence = gl.getUniformLocation(prog, 'u_pointer_influence');
		var uBrightness = gl.getUniformLocation(prog, 'u_brightness');

		var config = { SPEED: 0.8, REFRACTION: 1.0, COLOR_TEMP: 'cool', POINTER_INFLUENCE: 0.6, BRIGHTNESS: 1.2, BACKGROUND_COLOR: '#010108', PAUSED: false };
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
			pointer.x += (pointer.targetX - pointer.x) * 0.05;
			pointer.y += (pointer.targetY - pointer.y) * 0.05;

			gl.useProgram(prog);
			gl.bindBuffer(gl.ARRAY_BUFFER, buf);
			gl.enableVertexAttribArray(aPos);
			gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

			gl.uniform2f(uRes, canvas.width, canvas.height);
			gl.uniform1f(uTime, time * 0.001);
			gl.uniform2f(uPointer, pointer.x, pointer.y);
			gl.uniform1f(uSpeed, config.SPEED);
			gl.uniform1f(uRefraction, config.REFRACTION);
			gl.uniform1i(uColorTemp, COLOR_TEMP_MAP[config.COLOR_TEMP] || 0);
			gl.uniform1f(uPointerInfluence, config.POINTER_INFLUENCE);
			gl.uniform1f(uBrightness, config.BRIGHTNESS);

			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
			frameHandle = requestAnimationFrame(render);
		}

		function applyAceConfig(cfg) {
			if (!cfg) { return; }
			if (cfg.causticsSpeed !== undefined && cfg.causticsSpeed !== null) { config.SPEED = parseFloat(cfg.causticsSpeed) || config.SPEED; }
			if (cfg.causticsRefraction !== undefined && cfg.causticsRefraction !== null) { config.REFRACTION = parseFloat(cfg.causticsRefraction) || config.REFRACTION; }
			if (cfg.causticsColorTemp) { config.COLOR_TEMP = cfg.causticsColorTemp; }
			if (cfg.causticsPointerInfluence !== undefined && cfg.causticsPointerInfluence !== null) { config.POINTER_INFLUENCE = parseFloat(cfg.causticsPointerInfluence); }
			if (cfg.causticsBrightness !== undefined && cfg.causticsBrightness !== null) { config.BRIGHTNESS = parseFloat(cfg.causticsBrightness) || config.BRIGHTNESS; }
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
		applyAceConfig({ causticsSpeed: sp.get('causticsSpeed'), causticsRefraction: sp.get('causticsRefraction'), causticsColorTemp: sp.get('causticsColorTemp'), causticsPointerInfluence: sp.get('causticsPointerInfluence'), causticsBrightness: sp.get('causticsBrightness'), backgroundColor: sp.get('backgroundColor') });
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
				gl.deleteProgram(prog);
				gl.deleteBuffer(buf);
			},
			setPaused: function (p) { config.PAUSED = !!p; },
		};
	}

	window.ArtisticCreationEnvironmentCaustics = createAceCaustics;

	if (document.body && document.body.getAttribute('data-artistic-caustics-preview') === '1') {
		window.ArtisticCreationEnvironmentCaustics(document.body);
	}
})();
