// Aurora Flow — WebGL GLSL full-screen shader effect.
// Layered FBM noise rendered as polar aurora ribbons with soft atmospheric bloom.
(function () {
	'use strict';

	var VERT_SRC = [
		'attribute vec2 a_pos;',
		'void main(){gl_Position=vec4(a_pos,0.0,1.0);}',
	].join('\n');

	var FRAG_SRC = [
		'precision mediump float;',
		'uniform vec2  u_res;',
		'uniform float u_time;',
		'uniform vec2  u_pointer;',
		'uniform float u_intensity;',
		'uniform float u_speed;',
		'uniform float u_bands;',
		'uniform int   u_palette;',
		'uniform float u_pointer_influence;',

		// --- noise helpers ---
		'vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}',
		'vec2 mod289(vec2 x){return x-floor(x*(1.0/289.0))*289.0;}',
		'vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}',
		'float snoise(vec2 v){',
		'  const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);',
		'  vec2 i=floor(v+dot(v,C.yy));',
		'  vec2 x0=v-i+dot(i,C.xx);',
		'  vec2 i1=x0.x>x0.y?vec2(1.0,0.0):vec2(0.0,1.0);',
		'  vec4 x12=x0.xyxy+C.xxzz;',
		'  x12.xy-=i1;',
		'  i=mod289(i);',
		'  vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));',
		'  vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);',
		'  m=m*m; m=m*m;',
		'  vec3 x2=2.0*fract(p*C.www)-1.0;',
		'  vec3 h=abs(x2)-0.5;',
		'  vec3 ox=floor(x2+0.5);',
		'  vec3 a0=x2-ox;',
		'  m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);',
		'  vec3 g;',
		'  g.x=a0.x*x0.x+h.x*x0.y;',
		'  g.yz=a0.yz*x12.xz+h.yz*x12.yw;',
		'  return 130.0*dot(m,g);',
		'}',
		'float fbm(vec2 p){',
		'  float v=0.0,a=0.5;',
		'  for(int i=0;i<5;i++){v+=a*snoise(p);p*=2.0;a*=0.5;}',
		'  return v;',
		'}',

		// --- palette ---
		'vec3 auroraColor(float t, int pal){',
		'  t=clamp(t,0.0,1.0);',
		'  if(pal==1){', // sunset
		'    return mix(vec3(0.55,0.02,0.28),mix(vec3(0.9,0.35,0.1),vec3(0.98,0.82,0.12),t*t),t);',
		'  }',
		'  if(pal==2){', // deep space
		'    return mix(vec3(0.02,0.01,0.22),mix(vec3(0.12,0.04,0.52),vec3(0.62,0.18,0.88),t),t);',
		'  }',
		// aurora (default)
		'  return mix(vec3(0.02,0.12,0.28),mix(vec3(0.06,0.52,0.44),vec3(0.54,0.96,0.58),t*t),t);',
		'}',

		'void main(){',
		'  vec2 uv=(gl_FragCoord.xy/u_res)*2.0-1.0;',
		'  uv.x*=u_res.x/u_res.y;',

		// pointer nudge
		'  vec2 ptr=(u_pointer*2.0-1.0);',
		'  ptr.x*=u_res.x/u_res.y;',
		'  uv+=ptr*u_pointer_influence*0.35;',

		'  float t=u_time*u_speed*0.18;',
		'  float bandStep=1.0/u_bands;',
		'  vec3 col=vec3(0.0);',

		'  for(int b=0;b<8;b++){',
		'    if(float(b)>=u_bands) break;',
		'    float bOff=float(b)*bandStep;',
		'    vec2 p=uv+vec2(bOff*1.7,bOff*0.9);',
		'    float noise=fbm(p*1.4+vec2(t,t*0.7));',
		'    float yBand=uv.y*0.5+0.5+bOff*0.6-0.3;',
		'    float ribbon=exp(-pow((yBand-0.5+noise*0.45)*u_bands*1.6,2.0)*5.0);',
		'    float glow=exp(-pow((yBand-0.5+noise*0.45)*u_bands*1.6,2.0)*1.5)*0.35;',
		'    float bright=(ribbon+glow)*u_intensity;',
		'    vec3 bandCol=auroraColor((bOff+noise*0.2+0.3),u_palette);',
		'    col+=bandCol*bright;',
		'  }',

		// subtle background gradient
		'  col+=auroraColor(0.05,u_palette)*0.04;',
		'  col=pow(clamp(col,0.0,1.0),vec3(0.88));',
		'  gl_FragColor=vec4(col,1.0);',
		'}',
	].join('\n');

	function createShader(gl, type, src) {
		var shader = gl.createShader(type);
		gl.shaderSource(shader, src);
		gl.compileShader(shader);
		return shader;
	}

	function createProgram(gl, vert, frag) {
		var program = gl.createProgram();
		gl.attachShader(program, vert);
		gl.attachShader(program, frag);
		gl.linkProgram(program);
		return program;
	}

	function createAceAuroraFlow(rootElement, initialConfig, options) {
		var root = rootElement && rootElement.querySelector ? rootElement : document.body;
		var runtimeOptions = options || {};
		var interactionSurface = runtimeOptions.interactionSurface && runtimeOptions.interactionSurface.addEventListener
			? runtimeOptions.interactionSurface
			: root;

		var canvas = root.querySelector('canvas');
		if (!canvas) {
			canvas = document.createElement('canvas');
			canvas.className = 'artistic-creative__canvas';
			root.appendChild(canvas);
		}

		var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
		if (!gl) {
			return { applyConfig: function () {}, destroy: function () {}, setPaused: function () {} };
		}

		var PALETTE_MAP = { aurora: 0, sunset: 1, deepspace: 2 };

		var config = {
			SPEED: 1.0,
			PALETTE: 'aurora',
			INTENSITY: 1.0,
			BANDS: 5,
			POINTER_INFLUENCE: 0.5,
			BACKGROUND_COLOR: '#000000',
			PAUSED: false,
		};

		var pointer = { x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5 };
		var frameHandle = 0;
		var destroyed = false;

		var vert = createShader(gl, gl.VERTEX_SHADER, VERT_SRC);
		var frag = createShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
		var program = createProgram(gl, vert, frag);

		var buf = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buf);
		gl.bufferData(
			gl.ARRAY_BUFFER,
			new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
			gl.STATIC_DRAW
		);

		var aPos = gl.getAttribLocation(program, 'a_pos');
		var uRes = gl.getUniformLocation(program, 'u_res');
		var uTime = gl.getUniformLocation(program, 'u_time');
		var uPointer = gl.getUniformLocation(program, 'u_pointer');
		var uIntensity = gl.getUniformLocation(program, 'u_intensity');
		var uSpeed = gl.getUniformLocation(program, 'u_speed');
		var uBands = gl.getUniformLocation(program, 'u_bands');
		var uPalette = gl.getUniformLocation(program, 'u_palette');
		var uPointerInfluence = gl.getUniformLocation(program, 'u_pointer_influence');

		function resize() {
			var w = root.offsetWidth || 640;
			var h = root.offsetHeight || 360;
			if (canvas.width !== w || canvas.height !== h) {
				canvas.width = w;
				canvas.height = h;
				gl.viewport(0, 0, w, h);
			}
		}

		function render(time) {
			if (destroyed || config.PAUSED) {
				frameHandle = requestAnimationFrame(render);
				return;
			}

			resize();

			pointer.x += (pointer.targetX - pointer.x) * 0.06;
			pointer.y += (pointer.targetY - pointer.y) * 0.06;

			var t = time * 0.001;

			gl.useProgram(program);
			gl.bindBuffer(gl.ARRAY_BUFFER, buf);
			gl.enableVertexAttribArray(aPos);
			gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

			gl.uniform2f(uRes, canvas.width, canvas.height);
			gl.uniform1f(uTime, t);
			gl.uniform2f(uPointer, pointer.x, pointer.y);
			gl.uniform1f(uIntensity, config.INTENSITY);
			gl.uniform1f(uSpeed, config.SPEED);
			gl.uniform1f(uBands, Math.max(2, Math.min(8, config.BANDS)));
			gl.uniform1i(uPalette, PALETTE_MAP[config.PALETTE] || 0);
			gl.uniform1f(uPointerInfluence, config.POINTER_INFLUENCE);

			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
			frameHandle = requestAnimationFrame(render);
		}

		function applyAceConfig(incoming) {
			if (!incoming) { return; }
			if (incoming.auroraSpeed !== undefined && incoming.auroraSpeed !== null) { config.SPEED = parseFloat(incoming.auroraSpeed) || config.SPEED; }
			if (incoming.auroraPalette) { config.PALETTE = incoming.auroraPalette; }
			if (incoming.auroraIntensity !== undefined && incoming.auroraIntensity !== null) { config.INTENSITY = parseFloat(incoming.auroraIntensity) || config.INTENSITY; }
			if (incoming.auroraBands !== undefined && incoming.auroraBands !== null) { config.BANDS = parseInt(incoming.auroraBands, 10) || config.BANDS; }
			if (incoming.auroraPointerInfluence !== undefined && incoming.auroraPointerInfluence !== null) { config.POINTER_INFLUENCE = parseFloat(incoming.auroraPointerInfluence); }
			if (incoming.backgroundColor) { config.BACKGROUND_COLOR = incoming.backgroundColor; root.style.background = incoming.backgroundColor; }
		}

		function onPointerMove(e) {
			var rect = interactionSurface.getBoundingClientRect();
			var cx = (e.touches ? e.touches[0].clientX : e.clientX);
			var cy = (e.touches ? e.touches[0].clientY : e.clientY);
			pointer.targetX = (cx - rect.left) / rect.width;
			pointer.targetY = 1.0 - (cy - rect.top) / rect.height;
		}

		function onMessage(e) {
			if (!e.data || e.data.type !== 'artistic-creation-environment-preview') { return; }
			applyAceConfig(e.data.config || {});
		}

		var searchParams = new URLSearchParams(window.location.search);
		applyAceConfig({
			auroraSpeed: searchParams.get('auroraSpeed'),
			auroraPalette: searchParams.get('auroraPalette'),
			auroraIntensity: searchParams.get('auroraIntensity'),
			auroraBands: searchParams.get('auroraBands'),
			auroraPointerInfluence: searchParams.get('auroraPointerInfluence'),
			backgroundColor: searchParams.get('backgroundColor'),
		});
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
			setPaused: function (paused) { config.PAUSED = !!paused; },
		};
	}

	window.ArtisticCreationEnvironmentAurora = createAceAuroraFlow;

	if (document.body && document.body.getAttribute('data-artistic-aurora-preview') === '1') {
		window.ArtisticCreationEnvironmentAurora(document.body);
	}
})();
