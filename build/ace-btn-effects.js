(function () {
	'use strict';

	if ( window._aceArtisticBtnEffectsInit ) {
		return;
	}
	window._aceArtisticBtnEffectsInit = true;

	var VERT_SRC = 'attribute vec2 a_pos;void main(){gl_Position=vec4(a_pos,0.,1.);}';
	var AURORA_PALETTE_MAP = { aurora: 0, sunset: 1, deepspace: 2 };
	var NEON_SCHEME_MAP = { cyan: 0, magenta: 1, gold: 2 };

	function buildGLProgram( gl, vertSrc, fragSrc ) {
		function buildShader( type, src ) {
			var shader = gl.createShader( type );
			if ( ! shader ) {
				return null;
			}
			gl.shaderSource( shader, src );
			gl.compileShader( shader );
			if ( ! gl.getShaderParameter( shader, gl.COMPILE_STATUS ) ) {
				gl.deleteShader( shader );
				return null;
			}
			return shader;
		}

		var vert = buildShader( gl.VERTEX_SHADER, vertSrc );
		var frag = buildShader( gl.FRAGMENT_SHADER, fragSrc );
		var program;

		if ( ! vert || ! frag ) {
			if ( vert ) {
				gl.deleteShader( vert );
			}
			if ( frag ) {
				gl.deleteShader( frag );
			}
			return null;
		}

		program = gl.createProgram();
		if ( ! program ) {
			gl.deleteShader( vert );
			gl.deleteShader( frag );
			return null;
		}

		gl.attachShader( program, vert );
		gl.attachShader( program, frag );
		gl.linkProgram( program );
		gl.deleteShader( vert );
		gl.deleteShader( frag );

		if ( ! gl.getProgramParameter( program, gl.LINK_STATUS ) ) {
			gl.deleteProgram( program );
			return null;
		}

		return program;
	}

	var AURORA_FRAG = [
		'precision mediump float;',
		'uniform vec2  u_res;',
		'uniform float u_time;',
		'uniform vec2  u_pointer;',
		'uniform float u_intensity;',
		'uniform float u_speed;',
		'uniform float u_bands;',
		'uniform int   u_palette;',
		'uniform float u_pointer_influence;',
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
		'vec3 auroraColor(float t, int pal){',
		'  t=clamp(t,0.0,1.0);',
		'  if(pal==1){',
		'    return mix(vec3(0.55,0.02,0.28),mix(vec3(0.9,0.35,0.1),vec3(0.98,0.82,0.12),t*t),t);',
		'  }',
		'  if(pal==2){',
		'    return mix(vec3(0.02,0.01,0.22),mix(vec3(0.12,0.04,0.52),vec3(0.62,0.18,0.88),t),t);',
		'  }',
		'  return mix(vec3(0.02,0.12,0.28),mix(vec3(0.06,0.52,0.44),vec3(0.54,0.96,0.58),t*t),t);',
		'}',
		'void main(){',
		'  vec2 uv=(gl_FragCoord.xy/u_res)*2.0-1.0;',
		'  uv.x*=u_res.x/u_res.y;',
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
		'  col+=auroraColor(0.05,u_palette)*0.04;',
		'  col=pow(clamp(col,0.0,1.0),vec3(0.88));',
		'  gl_FragColor=vec4(col,1.0);',
		'}',
	].join( '\n' );

	var NEON_FRAG = [
		'precision mediump float;',
		'uniform vec2  u_res;',
		'uniform float u_time;',
		'uniform vec2  u_pointer;',
		'uniform float u_speed;',
		'uniform float u_line_density;',
		'uniform int   u_scheme;',
		'uniform float u_pointer_influence;',
		'uniform float u_glow;',
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
		'  if(scheme==1){return mix(vec3(1.,0.08,0.62),vec3(0.62,0.,1.),t);}',
		'  if(scheme==2){return mix(vec3(1.,0.72,0.),vec3(1.,0.35,0.),t);}',
		'  return mix(vec3(0.,0.92,1.),vec3(0.2,1.,0.55),t);',
		'}',
		'void main(){',
		'  vec2 uv=(gl_FragCoord.xy/u_res)*2.-1.;',
		'  uv.x*=u_res.x/u_res.y;',
		'  vec2 ptr=(u_pointer*2.-1.);',
		'  ptr.x*=u_res.x/u_res.y;',
		'  uv+=ptr*u_pointer_influence*0.4;',
		'  float t=u_time*u_speed*0.12;',
		'  float field=fbm(uv*1.8+vec2(t,t*0.71));',
		'  float lines=field*u_line_density;',
		'  float fw=0.04;',
		'  float edge=abs(fract(lines)-0.5);',
		'  float lineAlpha=1.-smoothstep(fw,fw*2.,edge);',
		'  float glowAlpha=(1.-smoothstep(fw*2.,fw*12.,edge))*u_glow*0.4;',
		'  float tColor=fract(field*0.5+0.5);',
		'  vec3 lineCol=neonColor(tColor,u_scheme);',
		'  vec3 col=(lineCol*(lineAlpha+glowAlpha));',
		'  col=mix(vec3(0.01,0.01,0.04),col,clamp(lineAlpha+glowAlpha,0.,1.));',
		'  gl_FragColor=vec4(col,1.);',
		'}',
	].join( '\n' );

	var PRISM_FRAG = [
		'precision mediump float;',
		'uniform vec2  u_res;',
		'uniform float u_time;',
		'uniform vec2  u_pointer;',
		'vec3 getSpec(int i){',
		'  if(i==0) return vec3(0.55,0.02,0.85);',
		'  if(i==1) return vec3(0.28,0.04,0.75);',
		'  if(i==2) return vec3(0.04,0.35,0.95);',
		'  if(i==3) return vec3(0.02,0.85,0.18);',
		'  if(i==4) return vec3(0.95,0.90,0.02);',
		'  if(i==5) return vec3(1.00,0.40,0.02);',
		'  return vec3(0.95,0.08,0.02);',
		'}',
		'void main(){',
		'  vec2 uv=(gl_FragCoord.xy/u_res)*2.0-1.0;',
		'  uv.x*=u_res.x/u_res.y;',
		'  float t=u_time*0.25;',
		'  float tilt=(u_pointer.x-0.5)*1.4+t*0.4;',
		'  vec2 axis=vec2(cos(tilt),sin(tilt));',
		'  float d=dot(uv,axis);',
		'  vec3 col=vec3(0.0);',
		'  for(int i=0;i<7;i++){',
		'    float fi=float(i)-3.0;',
		'    float disp=fi*0.055;',
		'    float wave=d+disp+sin(t*0.6+float(i)*0.9)*0.06;',
		'    float beam=pow(max(0.0,1.0-abs(wave*6.0)),2.5)*2.2;',
		'    col+=getSpec(i)*beam;',
		'  }',
		'  float brightness=(col.r+col.g+col.b)/3.0;',
		'  col=mix(vec3(0.02,0.01,0.05),col,clamp(brightness*1.2,0.0,1.0));',
		'  col=pow(clamp(col,0.0,1.0),vec3(0.88));',
		'  gl_FragColor=vec4(col,1.0);',
		'}',
	].join( '\n' );

	var PLASMA_FRAG = [
		'precision mediump float;',
		'uniform vec2  u_res;',
		'uniform float u_time;',
		'uniform vec2  u_pointer;',
		'void main(){',
		'  vec2 uv=gl_FragCoord.xy/u_res;',
		'  float t=u_time*0.55;',
		'  vec2 p=uv*7.0;',
		'  vec2 ptr=u_pointer*7.0;',
		'  float dist=length(p-ptr);',
		'  float v=sin(p.x+t)+sin(p.y*0.9+t*0.85)+sin((p.x+p.y)*0.65+t*1.1)+sin(sqrt(dist+0.001)*1.8-t*0.75);',
		'  v=(v+4.0)*0.125;',
		'  float r=0.38+0.52*sin(v*6.283*1.4+0.8);',
		'  float g=0.05+0.18*sin(v*6.283*1.4+2.6);',
		'  float b=0.48+0.52*sin(v*6.283*1.4+4.4);',
		'  float lum=(r+g+b)/3.0;',
		'  vec3 col=vec3(r,g,b)*pow(lum,0.55)*1.55;',
		'  col=pow(clamp(col,0.0,1.0),vec3(0.9));',
		'  gl_FragColor=vec4(col,1.0);',
		'}',
	].join( '\n' );

	var INFERNO_FRAG = [
		'precision mediump float;',
		'uniform vec2  u_res;',
		'uniform float u_time;',
		'uniform vec2  u_pointer;',
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
		'void main(){',
		'  vec2 uv=gl_FragCoord.xy/u_res;',
		'  float t=u_time*0.6;',
		'  float pd=length(vec2((u_pointer.x-uv.x)*2.5,u_pointer.y-uv.y));',
		'  float heat=exp(-pd*pd*8.0)*0.85;',
		'  vec2 p=vec2(uv.x*3.0,uv.y*3.5-t);',
		'  float wx=snoise(p+vec2(0.0,0.3));',
		'  float wy=snoise(p+vec2(3.7,1.1));',
		'  vec2 wp=p+vec2(wx,wy)*0.65;',
		'  float turb=0.0;',
		'  turb+=0.500*snoise(wp);',
		'  turb+=0.250*snoise(wp*2.03+vec2(0.8,1.5));',
		'  turb+=0.125*abs(snoise(wp*4.1+vec2(2.2,0.9)));',
		'  turb+=0.063*abs(snoise(wp*8.2));',
		'  turb=turb*0.5+0.5;',
		'  float tip1=snoise(vec2(uv.x*3.5,t*0.5))*0.18;',
		'  float tip2=snoise(vec2(uv.x*7.0,t*1.1))*0.08;',
		'  float yFade=clamp((1.0-uv.y)*1.45+tip1+tip2+heat*0.5,0.0,1.3);',
		'  float fire=clamp(turb*yFade,0.0,1.0);',
		'  vec3 col;',
		'  if(fire<0.12)      col=mix(vec3(0.0),vec3(0.42,0.0,0.0),fire/0.12);',
		'  else if(fire<0.32) col=mix(vec3(0.42,0.0,0.0),vec3(0.90,0.10,0.0),(fire-0.12)/0.20);',
		'  else if(fire<0.55) col=mix(vec3(0.90,0.10,0.0),vec3(1.0,0.52,0.0),(fire-0.32)/0.23);',
		'  else if(fire<0.74) col=mix(vec3(1.0,0.52,0.0),vec3(1.0,0.82,0.04),(fire-0.55)/0.19);',
		'  else if(fire<0.88) col=mix(vec3(1.0,0.82,0.04),vec3(1.0,0.97,0.65),(fire-0.74)/0.14);',
		'  else               col=mix(vec3(1.0,0.97,0.65),vec3(1.0,1.0,1.0),(fire-0.88)/0.12);',
		'  col.b+=max(0.0,(fire-0.90)*2.0);',
		'  gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);',
		'}',
	].join( '\n' );


	// ── Particle Systems ─────────────────────────────────────────────────────
	// Each returns a destroy() function. Called from respective factory.

	function createAuroraParticles( pCanvas, link, cfg ) {
		var ctx = pCanvas.getContext( '2d' );
		if ( ! ctx ) { return null; }
		var PALETTES = {
			aurora:    [ '#4ade80', '#22d3ee', '#34d399', '#6ee7b7' ],
			sunset:    [ '#f97316', '#ec4899', '#f59e0b', '#ef4444' ],
			deepspace: [ '#8b5cf6', '#a855f7', '#6366f1', '#c084fc' ],
		};
		var colors = PALETTES[ cfg.palette ] || PALETTES.aurora;
		var particles = [];
		function spawn() {
			var w = pCanvas.width || 200, h = pCanvas.height || 48;
			return { x: Math.random() * w, y: h + 10,
				vx: ( Math.random() - 0.5 ) * 0.45, vy: -( 0.2 + Math.random() * 0.35 ),
				life: 0, maxLife: 80 + Math.random() * 60,
				size: 4 + Math.random() * 8, stretch: 2.5 + Math.random() * 2.5,
				rot: Math.random() * Math.PI,
				color: colors[ Math.floor( Math.random() * colors.length ) ] };
		}
		for ( var i = 0; i < 6; i++ ) {
			var p = spawn();
			p.y = Math.random() * ( pCanvas.height || 48 );
			p.life = Math.random() * p.maxLife;
			particles.push( p );
		}
		var stopped = false, raf = 0;
		function tick() {
			if ( stopped || ! pCanvas.isConnected ) { stopped = true; return; }
			var w = link.offsetWidth || 200, h = link.offsetHeight || 48;
			if ( pCanvas.width !== w || pCanvas.height !== h ) { pCanvas.width = w; pCanvas.height = h; }
			ctx.clearRect( 0, 0, w, h );
			for ( var i = 0; i < particles.length; i++ ) {
				var pt = particles[ i ];
				pt.life++;
				if ( pt.life >= pt.maxLife ) { particles[ i ] = spawn(); continue; }
				pt.x += pt.vx; pt.y += pt.vy;
				var t = pt.life / pt.maxLife;
				var a = ( t < 0.2 ? t / 0.2 : ( 1.0 - ( t - 0.2 ) / 0.8 ) ) * 0.55;
				ctx.save();
				ctx.globalAlpha = a;
				ctx.translate( pt.x, pt.y );
				ctx.rotate( pt.rot );
				ctx.scale( 1, pt.stretch );
				var gr = ctx.createRadialGradient( 0, 0, 0, 0, 0, pt.size );
				gr.addColorStop( 0, pt.color );
				gr.addColorStop( 1, 'transparent' );
				ctx.fillStyle = gr;
				ctx.beginPath(); ctx.arc( 0, 0, pt.size, 0, Math.PI * 2 ); ctx.fill();
				ctx.restore();
			}
			if ( particles.length < 6 ) { particles.push( spawn() ); }
			raf = requestAnimationFrame( tick );
		}
		raf = requestAnimationFrame( tick );
		return function () {
			stopped = true;
			if ( raf ) { cancelAnimationFrame( raf ); }
			if ( pCanvas.parentNode ) { pCanvas.parentNode.removeChild( pCanvas ); }
		};
	}

	function createNeonParticles( pCanvas, link, cfg ) {
		var ctx = pCanvas.getContext( '2d' );
		if ( ! ctx ) { return null; }
		var SCHEME_COLORS = { cyan: '#00f5ff', magenta: '#ff00ff', gold: '#ffd700' };
		var color = SCHEME_COLORS[ cfg.neonScheme ] || '#00f5ff';
		var sparks = [], stopped = false, raf = 0, tick = 0;
		var mouseX = -1, mouseY = -1;
		function spawnSpark( x, y ) {
			var w = pCanvas.width || 200, h = pCanvas.height || 48;
			var sx = ( x !== undefined ) ? x : Math.random() * w;
			var sy = ( y !== undefined ) ? y : Math.random() * h;
			var len = 6 + Math.random() * 18, ang = Math.random() * Math.PI * 2;
			return { x: sx, y: sy, x2: sx + Math.cos( ang ) * len, y2: sy + Math.sin( ang ) * len,
				life: 0, maxLife: 8 + Math.floor( Math.random() * 10 ), w: 0.6 + Math.random() * 1.4 };
		}
		function onMove( e ) {
			var rect = link.getBoundingClientRect();
			mouseX = ( e.touches ? e.touches[ 0 ].clientX : e.clientX ) - rect.left;
			mouseY = ( e.touches ? e.touches[ 0 ].clientY : e.clientY ) - rect.top;
		}
		link.addEventListener( 'mousemove', onMove, true );
		link.addEventListener( 'touchmove', onMove, { passive: true, capture: true } );
		function run() {
			if ( stopped || ! pCanvas.isConnected ) { stopped = true; return; }
			var w = link.offsetWidth || 200, h = link.offsetHeight || 48;
			if ( pCanvas.width !== w || pCanvas.height !== h ) { pCanvas.width = w; pCanvas.height = h; }
			ctx.clearRect( 0, 0, w, h );
			tick++;
			var sparksMap = { off: 0, light: 0.25, medium: 0.65, heavy: 1.0 };
			var sparksChance = sparksMap[ cfg.neonSparks ] != null ? sparksMap[ cfg.neonSparks ] : 0.65;
			if ( sparksChance > 0 && tick % 8 === 0 && Math.random() < sparksChance ) { sparks.push( spawnSpark() ); }
			if ( mouseX >= 0 && Math.random() < 0.2 ) {
				sparks.push( spawnSpark(
					mouseX + ( Math.random() - 0.5 ) * 24,
					mouseY + ( Math.random() - 0.5 ) * 24
				) );
			}
			for ( var i = sparks.length - 1; i >= 0; i-- ) {
				var s = sparks[ i ];
				s.life++;
				if ( s.life >= s.maxLife ) { sparks.splice( i, 1 ); continue; }
				var t = s.life / s.maxLife;
				var a = ( t < 0.15 ? t / 0.15 : 1.0 - ( t - 0.15 ) / 0.85 ) * 0.9;
				ctx.save();
				ctx.globalAlpha = a;
				ctx.strokeStyle = color;
				ctx.lineWidth = s.w;
				ctx.shadowColor = color;
				ctx.shadowBlur = 5;
				ctx.beginPath(); ctx.moveTo( s.x, s.y ); ctx.lineTo( s.x2, s.y2 ); ctx.stroke();
				ctx.restore();
			}
			raf = requestAnimationFrame( run );
		}
		raf = requestAnimationFrame( run );
		return function () {
			stopped = true;
			if ( raf ) { cancelAnimationFrame( raf ); }
			link.removeEventListener( 'mousemove', onMove, true );
			link.removeEventListener( 'touchmove', onMove, true );
			if ( pCanvas.parentNode ) { pCanvas.parentNode.removeChild( pCanvas ); }
		};
	}

	function createPrismParticles( pCanvas, link, cfg ) {
		var ctx = pCanvas.getContext( '2d' );
		if ( ! ctx ) { return null; }
		var particles = [];
		function spawn() {
			var w = pCanvas.width || 200, h = pCanvas.height || 48;
			return { x: Math.random() * w, y: Math.random() * h,
				vx: ( Math.random() - 0.5 ) * 0.55, vy: ( Math.random() - 0.5 ) * 0.55,
				rot: Math.random() * Math.PI * 2, rotSpeed: ( Math.random() - 0.5 ) * 0.035,
				size: 3.5 + Math.random() * 6.5, hue: Math.random() * 360,
				life: 0, maxLife: 100 + Math.random() * 80 };
		}
		for ( var i = 0; i < 10; i++ ) {
			var p = spawn();
			p.life = Math.random() * p.maxLife;
			particles.push( p );
		}
		var stopped = false, raf = 0;
		function tick() {
			if ( stopped || ! pCanvas.isConnected ) { stopped = true; return; }
			var w = link.offsetWidth || 200, h = link.offsetHeight || 48;
			if ( pCanvas.width !== w || pCanvas.height !== h ) { pCanvas.width = w; pCanvas.height = h; }
			ctx.clearRect( 0, 0, w, h );
			for ( var i = 0; i < particles.length; i++ ) {
				var pt = particles[ i ];
				pt.life++;
				if ( pt.life >= pt.maxLife ) { particles[ i ] = spawn(); continue; }
				pt.x += pt.vx; pt.y += pt.vy;
				pt.rot += pt.rotSpeed;
				pt.hue = ( pt.hue + 0.5 ) % 360;
				if ( pt.x < 0 || pt.x > w ) { pt.vx *= -1; }
				if ( pt.y < 0 || pt.y > h ) { pt.vy *= -1; }
				var t = pt.life / pt.maxLife;
				var a = ( t < 0.15 ? t / 0.15 : ( 1.0 - ( t - 0.15 ) / 0.85 ) ) * 0.75;
				ctx.save();
				ctx.globalAlpha = a;
				ctx.translate( pt.x, pt.y );
				ctx.rotate( pt.rot );
				ctx.beginPath();
				ctx.moveTo( 0, -pt.size );
				ctx.lineTo( pt.size * 0.55, 0 );
				ctx.lineTo( 0, pt.size );
				ctx.lineTo( -pt.size * 0.55, 0 );
				ctx.closePath();
				var gr = ctx.createLinearGradient( -pt.size * 0.55, -pt.size, pt.size * 0.55, pt.size );
				gr.addColorStop( 0, 'hsl(' + pt.hue + ',100%,72%)' );
				gr.addColorStop( 0.5, 'hsl(' + ( ( pt.hue + 60 ) % 360 ) + ',100%,78%)' );
				gr.addColorStop( 1, 'hsl(' + ( ( pt.hue + 120 ) % 360 ) + ',100%,72%)' );
				ctx.fillStyle = gr;
				ctx.fill();
				ctx.restore();
			}
			raf = requestAnimationFrame( tick );
		}
		raf = requestAnimationFrame( tick );
		return function () {
			stopped = true;
			if ( raf ) { cancelAnimationFrame( raf ); }
			if ( pCanvas.parentNode ) { pCanvas.parentNode.removeChild( pCanvas ); }
		};
	}

	function createPlasmaParticles( pCanvas, link, cfg ) {
		var ctx = pCanvas.getContext( '2d' );
		if ( ! ctx ) { return null; }
		var orbs = [];
		function spawn() {
			var w = pCanvas.width || 200, h = pCanvas.height || 48;
			return { cx: w * 0.1 + Math.random() * w * 0.8,
				cy: h * 0.2 + Math.random() * h * 0.6,
				orbitR: 8 + Math.random() * 22, orbitAngle: Math.random() * Math.PI * 2,
				orbitSpeed: ( Math.random() - 0.5 ) * 0.04,
				r: 4 + Math.random() * 7, pulsePhase: Math.random() * Math.PI * 2,
				pulseSpeed: 0.05 + Math.random() * 0.05,
				hue: 255 + Math.random() * 75,
				life: 0, maxLife: 150 + Math.random() * 100 };
		}
		for ( var i = 0; i < 7; i++ ) {
			var o = spawn();
			o.life = Math.random() * o.maxLife;
			orbs.push( o );
		}
		var stopped = false, raf = 0;
		function tick() {
			if ( stopped || ! pCanvas.isConnected ) { stopped = true; return; }
			var w = link.offsetWidth || 200, h = link.offsetHeight || 48;
			if ( pCanvas.width !== w || pCanvas.height !== h ) { pCanvas.width = w; pCanvas.height = h; }
			ctx.clearRect( 0, 0, w, h );
			for ( var i = 0; i < orbs.length; i++ ) {
				var ob = orbs[ i ];
				ob.life++;
				if ( ob.life >= ob.maxLife ) { orbs[ i ] = spawn(); continue; }
				ob.orbitAngle += ob.orbitSpeed;
				ob.pulsePhase += ob.pulseSpeed;
				var x = ob.cx + Math.cos( ob.orbitAngle ) * ob.orbitR;
				var y = ob.cy + Math.sin( ob.orbitAngle ) * ob.orbitR * 0.5;
				var r = ob.r * ( 0.8 + 0.3 * Math.sin( ob.pulsePhase ) );
				var t = ob.life / ob.maxLife;
				var a = ( t < 0.2 ? t / 0.2 : ( 1.0 - ( t - 0.2 ) / 0.8 ) ) * 0.65;
				ctx.save();
				ctx.globalAlpha = a;
				var gr = ctx.createRadialGradient( x, y, 0, x, y, r * 2.5 );
				gr.addColorStop( 0, 'hsl(' + ob.hue + ',100%,85%)' );
				gr.addColorStop( 0.4, 'hsl(' + ob.hue + ',100%,60%)' );
				gr.addColorStop( 1, 'transparent' );
				ctx.fillStyle = gr;
				ctx.beginPath(); ctx.arc( x, y, r * 2.5, 0, Math.PI * 2 ); ctx.fill();
				ctx.restore();
			}
			raf = requestAnimationFrame( tick );
		}
		raf = requestAnimationFrame( tick );
		return function () {
			stopped = true;
			if ( raf ) { cancelAnimationFrame( raf ); }
			if ( pCanvas.parentNode ) { pCanvas.parentNode.removeChild( pCanvas ); }
		};
	}

	function createInfernoParticles( pCanvas, link, cfg ) {
		var ctx = pCanvas.getContext( '2d' );
		if ( ! ctx ) { return null; }
		var OVERHANG = 55, SIDE = 15;
		function resize() {
			var w = ( link.offsetWidth || 200 ) + SIDE * 2;
			var h = ( link.offsetHeight || 48 ) + OVERHANG;
			if ( pCanvas.width !== w || pCanvas.height !== h ) {
				pCanvas.width = w;
				pCanvas.height = h;
				pCanvas.style.left = ( -SIDE ) + 'px';
				pCanvas.style.top = ( -OVERHANG ) + 'px';
				pCanvas.style.width = w + 'px';
				pCanvas.style.height = h + 'px';
			}
		}
		var whipRateMap = { off: 0, light: 0.008, normal: 0.022, heavy: 0.05 };
		var whipRate = whipRateMap[ cfg.infernoWhips ] != null ? whipRateMap[ cfg.infernoWhips ] : 0.022;
		var whips = [];
		function spawnWhip() {
			var lw = link.offsetWidth || 200;
			return { x: SIDE + Math.random() * lw,
				baseY: OVERHANG + ( link.offsetHeight || 48 ),
				progress: 0, speed: 0.008 + Math.random() * 0.012,
				height: 38 + Math.random() * 50,
				wobble: Math.random() * Math.PI * 2,
				wobbleFreq: 0.06 + Math.random() * 0.07,
				thickness: 2.5 + Math.random() * 3.5,
				hue: 15 + Math.random() * 25 };
		}
		var embers = [];
		function spawnEmber() {
			var lw = link.offsetWidth || 200, lh = link.offsetHeight || 48;
			return { x: SIDE + Math.random() * lw,
				y: OVERHANG + lh * ( 0.2 + Math.random() * 0.7 ),
				vx: ( Math.random() - 0.5 ) * 1.4, vy: -( 0.8 + Math.random() * 1.7 ),
				life: 0, maxLife: 50 + Math.random() * 40,
				size: 1.2 + Math.random() * 1.8, hue: 25 + Math.random() * 30 };
		}
		var initialWhips = 0;
		if ( cfg.infernoWhips === 'light' ) {
			initialWhips = 2;
		} else if ( cfg.infernoWhips === 'normal' ) {
			initialWhips = 3;
		} else if ( cfg.infernoWhips === 'heavy' ) {
			initialWhips = 5;
		}
		for ( var i = 0; i < initialWhips; i++ ) { var wh = spawnWhip(); wh.progress = Math.random(); whips.push( wh ); }
		for ( var j = 0; j < 8; j++ ) { var em = spawnEmber(); em.life = Math.random() * em.maxLife; embers.push( em ); }
		var stopped = false, raf = 0;
		function tick() {
			if ( stopped || ! pCanvas.isConnected ) { stopped = true; return; }
			resize();
			ctx.clearRect( 0, 0, pCanvas.width, pCanvas.height );
			var now = performance.now() * 0.001;
			if ( Math.random() < whipRate ) { whips.push( spawnWhip() ); }
			for ( var i = whips.length - 1; i >= 0; i-- ) {
				var p = whips[ i ];
				p.progress += p.speed;
				if ( p.progress >= 1.0 ) { whips.splice( i, 1 ); continue; }
				var t = p.progress;
				var alpha = ( t < 0.3 ? t / 0.3 : ( t < 0.6 ? 1.0 : ( 1.0 - ( t - 0.6 ) / 0.4 ) ) ) * 0.85;
				var riseY = p.baseY - p.height * t;
				var wobX = Math.sin( now * p.wobbleFreq * 6.0 + p.wobble ) * p.thickness * 2.8 * ( 1.0 - t * 0.4 );
				var grad = ctx.createLinearGradient( p.x, p.baseY, p.x + wobX, riseY );
				grad.addColorStop( 0,   'hsla(' + p.hue + ',100%,55%,' + alpha + ')' );
				grad.addColorStop( 0.45,'hsla(' + ( p.hue + 15 ) + ',100%,60%,' + ( alpha * 0.8 ) + ')' );
				grad.addColorStop( 0.85,'hsla(' + ( p.hue + 30 ) + ',100%,65%,' + ( alpha * 0.35 ) + ')' );
				grad.addColorStop( 1.0, 'hsla(45,100%,80%,0)' );
				ctx.save();
				ctx.strokeStyle = grad;
				ctx.lineWidth = p.thickness * ( 1.0 - t * 0.65 );
				ctx.lineCap = 'round';
				ctx.lineJoin = 'round';
				ctx.beginPath();
				ctx.moveTo( p.x, p.baseY );
				ctx.quadraticCurveTo( p.x + wobX * 0.5, p.baseY - p.height * 0.5, p.x + wobX, riseY );
				ctx.stroke();
				ctx.restore();
			}
			for ( var j = 0; j < embers.length; j++ ) {
				var e = embers[ j ];
				e.life++;
				if ( e.life >= e.maxLife ) { embers[ j ] = spawnEmber(); continue; }
				e.x += e.vx; e.y += e.vy;
				e.vy += 0.04;
				e.vx += ( Math.random() - 0.5 ) * 0.08;
				var lt = e.life / e.maxLife;
				var ea = ( lt < 0.2 ? lt / 0.2 : 1.0 - ( lt - 0.2 ) / 0.8 ) * 0.88;
				ctx.save();
				ctx.globalAlpha = ea;
				var gr = ctx.createRadialGradient( e.x, e.y, 0, e.x, e.y, e.size * 2 );
				gr.addColorStop( 0, 'hsl(' + e.hue + ',100%,90%)' );
				gr.addColorStop( 0.5, 'hsl(' + e.hue + ',100%,65%)' );
				gr.addColorStop( 1, 'transparent' );
				ctx.fillStyle = gr;
				ctx.beginPath(); ctx.arc( e.x, e.y, e.size * 2, 0, Math.PI * 2 ); ctx.fill();
				ctx.restore();
			}
			raf = requestAnimationFrame( tick );
		}
		raf = requestAnimationFrame( tick );
		return function () {
			stopped = true;
			if ( raf ) { cancelAnimationFrame( raf ); }
			if ( pCanvas.parentNode ) { pCanvas.parentNode.removeChild( pCanvas ); }
		};
	}

	function createAuroraBtnEffect( canvas, link, cfg ) {
		var gl = canvas.getContext( 'webgl' ) || canvas.getContext( 'experimental-webgl' );
		if ( ! gl ) {
			return null;
		}

		var program = buildGLProgram( gl, VERT_SRC, AURORA_FRAG );
		if ( ! program ) {
			return null;
		}

		var buf = gl.createBuffer();
		gl.bindBuffer( gl.ARRAY_BUFFER, buf );
		gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( [ -1, -1, 1, -1, -1, 1, 1, 1 ] ), gl.STATIC_DRAW );

		var aPos = gl.getAttribLocation( program, 'a_pos' );
		var uRes = gl.getUniformLocation( program, 'u_res' );
		var uTime = gl.getUniformLocation( program, 'u_time' );
		var uPointer = gl.getUniformLocation( program, 'u_pointer' );
		var uIntensity = gl.getUniformLocation( program, 'u_intensity' );
		var uSpeed = gl.getUniformLocation( program, 'u_speed' );
		var uBands = gl.getUniformLocation( program, 'u_bands' );
		var uPalette = gl.getUniformLocation( program, 'u_palette' );
		var uPointerInfluence = gl.getUniformLocation( program, 'u_pointer_influence' );
		var palette = AURORA_PALETTE_MAP[ cfg.palette ];
		if ( typeof palette !== 'number' ) {
			palette = 0;
		}

		var pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
		var frameHandle = 0;
		var destroyed = false;

		function resize() {
			var w = link.offsetWidth || 200;
			var h = link.offsetHeight || 48;
			if ( canvas.width !== w || canvas.height !== h ) {
				canvas.width = w;
				canvas.height = h;
				gl.viewport( 0, 0, w, h );
			}
		}

		function render( time ) {
			if ( destroyed || ! canvas.isConnected ) {
				destroyed = true;
				return;
			}
			resize();
			pointer.x += ( pointer.tx - pointer.x ) * 0.07;
			pointer.y += ( pointer.ty - pointer.y ) * 0.07;
			gl.useProgram( program );
			gl.bindBuffer( gl.ARRAY_BUFFER, buf );
			gl.enableVertexAttribArray( aPos );
			gl.vertexAttribPointer( aPos, 2, gl.FLOAT, false, 0, 0 );
			gl.uniform2f( uRes, canvas.width, canvas.height );
			gl.uniform1f( uTime, time * 0.001 );
			gl.uniform2f( uPointer, pointer.x, pointer.y );
			gl.uniform1f( uIntensity, cfg.auroraIntensity != null ? cfg.auroraIntensity : 1.2 );
			gl.uniform1f( uSpeed, cfg.auroraSpeed != null ? cfg.auroraSpeed : 1.0 );
			gl.uniform1f( uBands, cfg.auroraBands != null ? cfg.auroraBands : 5.0 );
			gl.uniform1i( uPalette, palette );
			gl.uniform1f( uPointerInfluence, 0.6 );
			gl.drawArrays( gl.TRIANGLE_STRIP, 0, 4 );
			frameHandle = requestAnimationFrame( render );
		}

		function onPointerMove( e ) {
			var rect = link.getBoundingClientRect();
			pointer.tx = ( ( e.touches ? e.touches[ 0 ].clientX : e.clientX ) - rect.left ) / Math.max( rect.width, 1 );
			pointer.ty = 1.0 - ( ( ( e.touches ? e.touches[ 0 ].clientY : e.clientY ) - rect.top ) / Math.max( rect.height, 1 ) );
		}

		link.addEventListener( 'mousemove', onPointerMove, true );
		link.addEventListener( 'touchmove', onPointerMove, { passive: true, capture: true } );
		frameHandle = requestAnimationFrame( render );

		var pCanvas = document.createElement( 'canvas' );
		pCanvas.className = 'ace-btn-particle-canvas';
		pCanvas.setAttribute( 'aria-hidden', 'true' );
		pCanvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1;mix-blend-mode:screen;border-radius:inherit;';
		link.appendChild( pCanvas );
		var stopParticles = createAuroraParticles( pCanvas, link, cfg );
		var innerObs = null;
		if ( window.MutationObserver ) {
			innerObs = new MutationObserver( function () {
				if ( destroyed ) { return; }
				if ( ! canvas.parentNode || canvas.parentNode !== link ) { link.insertBefore( canvas, link.firstChild ); }
				if ( ! pCanvas.parentNode || pCanvas.parentNode !== link ) { link.appendChild( pCanvas ); }
			} );
			innerObs.observe( link, { childList: true } );
		}

		return {
			destroy: function () {
				if ( destroyed ) { return; }
				destroyed = true;
				if ( innerObs ) { innerObs.disconnect(); innerObs = null; }
				if ( stopParticles ) { stopParticles(); stopParticles = null; }
				if ( frameHandle ) { cancelAnimationFrame( frameHandle ); frameHandle = 0; }
				link.removeEventListener( 'mousemove', onPointerMove, true );
				link.removeEventListener( 'touchmove', onPointerMove, true );
				gl.deleteProgram( program );
				gl.deleteBuffer( buf );
				if ( canvas.parentNode ) { canvas.parentNode.removeChild( canvas ); }
			},
		};
	}

	function createNeonBtnEffect( canvas, link, cfg ) {
		var gl = canvas.getContext( 'webgl' ) || canvas.getContext( 'experimental-webgl' );
		if ( ! gl ) {
			return null;
		}

		var program = buildGLProgram( gl, VERT_SRC, NEON_FRAG );
		if ( ! program ) {
			return null;
		}

		var buf = gl.createBuffer();
		gl.bindBuffer( gl.ARRAY_BUFFER, buf );
		gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( [ -1, -1, 1, -1, -1, 1, 1, 1 ] ), gl.STATIC_DRAW );

		var aPos = gl.getAttribLocation( program, 'a_pos' );
		var uRes = gl.getUniformLocation( program, 'u_res' );
		var uTime = gl.getUniformLocation( program, 'u_time' );
		var uPointer = gl.getUniformLocation( program, 'u_pointer' );
		var uSpeed = gl.getUniformLocation( program, 'u_speed' );
		var uLineDensity = gl.getUniformLocation( program, 'u_line_density' );
		var uScheme = gl.getUniformLocation( program, 'u_scheme' );
		var uPointerInfluence = gl.getUniformLocation( program, 'u_pointer_influence' );
		var uGlow = gl.getUniformLocation( program, 'u_glow' );
		var scheme = NEON_SCHEME_MAP[ cfg.neonScheme ];
		if ( typeof scheme !== 'number' ) {
			scheme = 0;
		}

		var pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
		var frameHandle = 0;
		var destroyed = false;

		function resize() {
			var w = link.offsetWidth || 200;
			var h = link.offsetHeight || 48;
			if ( canvas.width !== w || canvas.height !== h ) {
				canvas.width = w;
				canvas.height = h;
				gl.viewport( 0, 0, w, h );
			}
		}

		function render( time ) {
			if ( destroyed || ! canvas.isConnected ) {
				destroyed = true;
				return;
			}
			resize();
			pointer.x += ( pointer.tx - pointer.x ) * 0.07;
			pointer.y += ( pointer.ty - pointer.y ) * 0.07;
			gl.useProgram( program );
			gl.bindBuffer( gl.ARRAY_BUFFER, buf );
			gl.enableVertexAttribArray( aPos );
			gl.vertexAttribPointer( aPos, 2, gl.FLOAT, false, 0, 0 );
			gl.uniform2f( uRes, canvas.width, canvas.height );
			gl.uniform1f( uTime, time * 0.001 );
			gl.uniform2f( uPointer, pointer.x, pointer.y );
			gl.uniform1f( uSpeed, cfg.neonSpeed != null ? cfg.neonSpeed : 1.0 );
			gl.uniform1f( uLineDensity, cfg.neonDensity != null ? cfg.neonDensity : 8.0 );
			gl.uniform1i( uScheme, scheme );
			gl.uniform1f( uPointerInfluence, 0.6 );
			gl.uniform1f( uGlow, cfg.neonGlow != null ? cfg.neonGlow : 1.2 );
			gl.drawArrays( gl.TRIANGLE_STRIP, 0, 4 );
			frameHandle = requestAnimationFrame( render );
		}

		function onPointerMove( e ) {
			var rect = link.getBoundingClientRect();
			pointer.tx = ( ( e.touches ? e.touches[ 0 ].clientX : e.clientX ) - rect.left ) / Math.max( rect.width, 1 );
			pointer.ty = 1.0 - ( ( ( e.touches ? e.touches[ 0 ].clientY : e.clientY ) - rect.top ) / Math.max( rect.height, 1 ) );
		}

		link.addEventListener( 'mousemove', onPointerMove, true );
		link.addEventListener( 'touchmove', onPointerMove, { passive: true, capture: true } );
		frameHandle = requestAnimationFrame( render );

		var pCanvas = document.createElement( 'canvas' );
		pCanvas.className = 'ace-btn-particle-canvas';
		pCanvas.setAttribute( 'aria-hidden', 'true' );
		pCanvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1;mix-blend-mode:screen;border-radius:inherit;';
		link.appendChild( pCanvas );
		var stopParticles = createNeonParticles( pCanvas, link, cfg );
		var innerObs = null;
		if ( window.MutationObserver ) {
			innerObs = new MutationObserver( function () {
				if ( destroyed ) { return; }
				if ( ! canvas.parentNode || canvas.parentNode !== link ) { link.insertBefore( canvas, link.firstChild ); }
				if ( ! pCanvas.parentNode || pCanvas.parentNode !== link ) { link.appendChild( pCanvas ); }
			} );
			innerObs.observe( link, { childList: true } );
		}

		return {
			destroy: function () {
				if ( destroyed ) { return; }
				destroyed = true;
				if ( innerObs ) { innerObs.disconnect(); innerObs = null; }
				if ( stopParticles ) { stopParticles(); stopParticles = null; }
				if ( frameHandle ) { cancelAnimationFrame( frameHandle ); frameHandle = 0; }
				link.removeEventListener( 'mousemove', onPointerMove, true );
				link.removeEventListener( 'touchmove', onPointerMove, true );
				gl.deleteProgram( program );
				gl.deleteBuffer( buf );
				if ( canvas.parentNode ) { canvas.parentNode.removeChild( canvas ); }
			},
		};
	}

	function createPrismBtnEffect( canvas, link, cfg ) {
		var gl = canvas.getContext( 'webgl' ) || canvas.getContext( 'experimental-webgl' );
		if ( ! gl ) {
			return null;
		}

		var program = buildGLProgram( gl, VERT_SRC, PRISM_FRAG );
		if ( ! program ) {
			return null;
		}

		var buf = gl.createBuffer();
		gl.bindBuffer( gl.ARRAY_BUFFER, buf );
		gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( [ -1, -1, 1, -1, -1, 1, 1, 1 ] ), gl.STATIC_DRAW );

		var aPos = gl.getAttribLocation( program, 'a_pos' );
		var uRes = gl.getUniformLocation( program, 'u_res' );
		var uTime = gl.getUniformLocation( program, 'u_time' );
		var uPointer = gl.getUniformLocation( program, 'u_pointer' );
		var uSpeed  = gl.getUniformLocation( program, 'u_speed' );
		var uSpread = gl.getUniformLocation( program, 'u_spread' );
		var pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
		var frameHandle = 0;
		var destroyed = false;

		function resize() {
			var w = link.offsetWidth || 200;
			var h = link.offsetHeight || 48;
			if ( canvas.width !== w || canvas.height !== h ) {
				canvas.width = w;
				canvas.height = h;
				gl.viewport( 0, 0, w, h );
			}
		}

		function render( time ) {
			if ( destroyed || ! canvas.isConnected ) {
				destroyed = true;
				return;
			}
			resize();
			pointer.x += ( pointer.tx - pointer.x ) * 0.07;
			pointer.y += ( pointer.ty - pointer.y ) * 0.07;
			gl.useProgram( program );
			gl.bindBuffer( gl.ARRAY_BUFFER, buf );
			gl.enableVertexAttribArray( aPos );
			gl.vertexAttribPointer( aPos, 2, gl.FLOAT, false, 0, 0 );
			gl.uniform2f( uRes, canvas.width, canvas.height );
			gl.uniform1f( uTime, time * 0.001 );
			gl.uniform2f( uPointer, pointer.x, pointer.y );
			gl.uniform1f( uSpeed, cfg.prismSpeed != null ? cfg.prismSpeed : 1.0 );
			gl.uniform1f( uSpread, cfg.prismSpread != null ? cfg.prismSpread : 1.0 );
			gl.drawArrays( gl.TRIANGLE_STRIP, 0, 4 );
			frameHandle = requestAnimationFrame( render );
		}

		function onPointerMove( e ) {
			var rect = link.getBoundingClientRect();
			pointer.tx = ( ( e.touches ? e.touches[ 0 ].clientX : e.clientX ) - rect.left ) / Math.max( rect.width, 1 );
			pointer.ty = 1.0 - ( ( ( e.touches ? e.touches[ 0 ].clientY : e.clientY ) - rect.top ) / Math.max( rect.height, 1 ) );
		}

		link.addEventListener( 'mousemove', onPointerMove, true );
		link.addEventListener( 'touchmove', onPointerMove, { passive: true, capture: true } );
		frameHandle = requestAnimationFrame( render );

		var pCanvas = document.createElement( 'canvas' );
		pCanvas.className = 'ace-btn-particle-canvas';
		pCanvas.setAttribute( 'aria-hidden', 'true' );
		pCanvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1;mix-blend-mode:screen;border-radius:inherit;';
		link.appendChild( pCanvas );
		var stopParticles = createPrismParticles( pCanvas, link, cfg );
		var innerObs = null;
		if ( window.MutationObserver ) {
			innerObs = new MutationObserver( function () {
				if ( destroyed ) { return; }
				if ( ! canvas.parentNode || canvas.parentNode !== link ) { link.insertBefore( canvas, link.firstChild ); }
				if ( ! pCanvas.parentNode || pCanvas.parentNode !== link ) { link.appendChild( pCanvas ); }
			} );
			innerObs.observe( link, { childList: true } );
		}

		return {
			destroy: function () {
				if ( destroyed ) { return; }
				destroyed = true;
				if ( innerObs ) { innerObs.disconnect(); innerObs = null; }
				if ( stopParticles ) { stopParticles(); stopParticles = null; }
				if ( frameHandle ) { cancelAnimationFrame( frameHandle ); frameHandle = 0; }
				link.removeEventListener( 'mousemove', onPointerMove, true );
				link.removeEventListener( 'touchmove', onPointerMove, true );
				gl.deleteProgram( program );
				gl.deleteBuffer( buf );
				if ( canvas.parentNode ) { canvas.parentNode.removeChild( canvas ); }
			},
		};
	}

	function createPlasmaBtnEffect( canvas, link, cfg ) {
		var gl = canvas.getContext( 'webgl' ) || canvas.getContext( 'experimental-webgl' );
		if ( ! gl ) {
			return null;
		}

		var program = buildGLProgram( gl, VERT_SRC, PLASMA_FRAG );
		if ( ! program ) {
			return null;
		}

		var buf = gl.createBuffer();
		gl.bindBuffer( gl.ARRAY_BUFFER, buf );
		gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( [ -1, -1, 1, -1, -1, 1, 1, 1 ] ), gl.STATIC_DRAW );

		var aPos = gl.getAttribLocation( program, 'a_pos' );
		var uRes = gl.getUniformLocation( program, 'u_res' );
		var uTime = gl.getUniformLocation( program, 'u_time' );
		var uPointer = gl.getUniformLocation( program, 'u_pointer' );
		var uSpeed       = gl.getUniformLocation( program, 'u_speed' );
		var uTurbulence  = gl.getUniformLocation( program, 'u_turbulence' );
		var pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
		var frameHandle = 0;
		var destroyed = false;

		function resize() {
			var w = link.offsetWidth || 200;
			var h = link.offsetHeight || 48;
			if ( canvas.width !== w || canvas.height !== h ) {
				canvas.width = w;
				canvas.height = h;
				gl.viewport( 0, 0, w, h );
			}
		}

		function render( time ) {
			if ( destroyed || ! canvas.isConnected ) {
				destroyed = true;
				return;
			}
			resize();
			pointer.x += ( pointer.tx - pointer.x ) * 0.07;
			pointer.y += ( pointer.ty - pointer.y ) * 0.07;
			gl.useProgram( program );
			gl.bindBuffer( gl.ARRAY_BUFFER, buf );
			gl.enableVertexAttribArray( aPos );
			gl.vertexAttribPointer( aPos, 2, gl.FLOAT, false, 0, 0 );
			gl.uniform2f( uRes, canvas.width, canvas.height );
			gl.uniform1f( uTime, time * 0.001 );
			gl.uniform2f( uPointer, pointer.x, pointer.y );
			gl.uniform1f( uSpeed,      cfg.plasmaSpeed      != null ? cfg.plasmaSpeed      : 1.0 );
			gl.uniform1f( uTurbulence, cfg.plasmaTurbulence != null ? cfg.plasmaTurbulence : 1.0 );
			gl.drawArrays( gl.TRIANGLE_STRIP, 0, 4 );
			frameHandle = requestAnimationFrame( render );
		}

		function onPointerMove( e ) {
			var rect = link.getBoundingClientRect();
			pointer.tx = ( ( e.touches ? e.touches[ 0 ].clientX : e.clientX ) - rect.left ) / Math.max( rect.width, 1 );
			pointer.ty = 1.0 - ( ( ( e.touches ? e.touches[ 0 ].clientY : e.clientY ) - rect.top ) / Math.max( rect.height, 1 ) );
		}

		link.addEventListener( 'mousemove', onPointerMove, true );
		link.addEventListener( 'touchmove', onPointerMove, { passive: true, capture: true } );
		frameHandle = requestAnimationFrame( render );

		var pCanvas = document.createElement( 'canvas' );
		pCanvas.className = 'ace-btn-particle-canvas';
		pCanvas.setAttribute( 'aria-hidden', 'true' );
		pCanvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1;mix-blend-mode:screen;border-radius:inherit;';
		link.appendChild( pCanvas );
		var stopParticles = createPlasmaParticles( pCanvas, link, cfg );
		var innerObs = null;
		if ( window.MutationObserver ) {
			innerObs = new MutationObserver( function () {
				if ( destroyed ) { return; }
				if ( ! canvas.parentNode || canvas.parentNode !== link ) { link.insertBefore( canvas, link.firstChild ); }
				if ( ! pCanvas.parentNode || pCanvas.parentNode !== link ) { link.appendChild( pCanvas ); }
			} );
			innerObs.observe( link, { childList: true } );
		}

		return {
			destroy: function () {
				if ( destroyed ) { return; }
				destroyed = true;
				if ( innerObs ) { innerObs.disconnect(); innerObs = null; }
				if ( stopParticles ) { stopParticles(); stopParticles = null; }
				if ( frameHandle ) { cancelAnimationFrame( frameHandle ); frameHandle = 0; }
				link.removeEventListener( 'mousemove', onPointerMove, true );
				link.removeEventListener( 'touchmove', onPointerMove, true );
				gl.deleteProgram( program );
				gl.deleteBuffer( buf );
				if ( canvas.parentNode ) { canvas.parentNode.removeChild( canvas ); }
			},
		};
	}

	function createInfernoBtnEffect( canvas, link, wrapper, cfg ) {
		var gl = canvas.getContext( 'webgl' ) || canvas.getContext( 'experimental-webgl' );
		if ( ! gl ) {
			return null;
		}

		var program = buildGLProgram( gl, VERT_SRC, INFERNO_FRAG );
		if ( ! program ) {
			return null;
		}

		var buf = gl.createBuffer();
		gl.bindBuffer( gl.ARRAY_BUFFER, buf );
		gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( [ -1, -1, 1, -1, -1, 1, 1, 1 ] ), gl.STATIC_DRAW );

		var aPos = gl.getAttribLocation( program, 'a_pos' );
		var uRes = gl.getUniformLocation( program, 'u_res' );
		var uTime = gl.getUniformLocation( program, 'u_time' );
		var uPointer = gl.getUniformLocation( program, 'u_pointer' );
		var uIntensity  = gl.getUniformLocation( program, 'u_intensity' );
		var uColortemp  = gl.getUniformLocation( program, 'u_colortemp' );
		var INFERNO_COLOR_MAP = { hot: 0, warm: 1, cool: 2, dark: 3 };
		var colortemp = INFERNO_COLOR_MAP[ cfg.infernoColor ] != null ? INFERNO_COLOR_MAP[ cfg.infernoColor ] : 0;
		var pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
		var frameHandle = 0;
		var destroyed = false;

		function resize() {
			var w = link.offsetWidth || 200;
			var h = link.offsetHeight || 48;
			if ( canvas.width !== w || canvas.height !== h ) {
				canvas.width = w;
				canvas.height = h;
				gl.viewport( 0, 0, w, h );
			}
		}

		function render( time ) {
			if ( destroyed || ! canvas.isConnected ) {
				destroyed = true;
				return;
			}
			resize();
			pointer.x += ( pointer.tx - pointer.x ) * 0.07;
			pointer.y += ( pointer.ty - pointer.y ) * 0.07;
			gl.useProgram( program );
			gl.bindBuffer( gl.ARRAY_BUFFER, buf );
			gl.enableVertexAttribArray( aPos );
			gl.vertexAttribPointer( aPos, 2, gl.FLOAT, false, 0, 0 );
			gl.uniform2f( uRes, canvas.width, canvas.height );
			gl.uniform1f( uTime, time * 0.001 );
			gl.uniform2f( uPointer, pointer.x, pointer.y );
			gl.uniform1f( uIntensity, cfg.infernoIntensity != null ? cfg.infernoIntensity : 1.0 );
			gl.uniform1i( uColortemp, colortemp );
			gl.drawArrays( gl.TRIANGLE_STRIP, 0, 4 );
			frameHandle = requestAnimationFrame( render );
		}

		function onPointerMove( e ) {
			var rect = link.getBoundingClientRect();
			pointer.tx = ( ( e.touches ? e.touches[ 0 ].clientX : e.clientX ) - rect.left ) / Math.max( rect.width, 1 );
			pointer.ty = 1.0 - ( ( ( e.touches ? e.touches[ 0 ].clientY : e.clientY ) - rect.top ) / Math.max( rect.height, 1 ) );
		}

		link.addEventListener( 'mousemove', onPointerMove, true );
		link.addEventListener( 'touchmove', onPointerMove, { passive: true, capture: true } );
		frameHandle = requestAnimationFrame( render );

		var pCanvas = document.createElement( 'canvas' );
		pCanvas.className = 'ace-btn-particle-canvas ace-btn-fire-whips';
		pCanvas.setAttribute( 'aria-hidden', 'true' );
		pCanvas.style.cssText = 'position:absolute;pointer-events:none;z-index:10;';
		wrapper.appendChild( pCanvas );
		var stopParticles = createInfernoParticles( pCanvas, link, cfg );
		var innerObs = null;
		if ( window.MutationObserver ) {
			innerObs = new MutationObserver( function () {
				if ( destroyed ) { return; }
				if ( ! canvas.parentNode || canvas.parentNode !== link ) { link.insertBefore( canvas, link.firstChild ); }
				// pCanvas stays on wrapper, no re-injection needed here
			} );
			innerObs.observe( link, { childList: true } );
		}

		return {
			destroy: function () {
				if ( destroyed ) { return; }
				destroyed = true;
				if ( innerObs ) { innerObs.disconnect(); innerObs = null; }
				if ( stopParticles ) { stopParticles(); stopParticles = null; }
				if ( frameHandle ) { cancelAnimationFrame( frameHandle ); frameHandle = 0; }
				link.removeEventListener( 'mousemove', onPointerMove, true );
				link.removeEventListener( 'touchmove', onPointerMove, true );
				gl.deleteProgram( program );
				gl.deleteBuffer( buf );
				if ( canvas.parentNode ) { canvas.parentNode.removeChild( canvas ); }
			},
		};
	}

	var WEBGL_TYPES = [ 'aurora', 'neon', 'prism', 'plasma', 'inferno' ];
	var WEBGL_SELECTOR = WEBGL_TYPES.map( function ( type ) {
		return '.ace-artistic-btn--' + type;
	} ).join( ', ' );

	function forEachNode( nodeList, callback ) {
		Array.prototype.forEach.call( nodeList, callback );
	}

	function getTypeFromWrapper( wrapper ) {
		for ( var i = 0; i < WEBGL_TYPES.length; i++ ) {
			if ( wrapper.classList.contains( 'ace-artistic-btn--' + WEBGL_TYPES[ i ] ) ) {
				return WEBGL_TYPES[ i ];
			}
		}
		return null;
	}

	function destroyWrapperEffect( wrapper ) {
		if ( wrapper && wrapper._aceAttrObs ) {
			wrapper._aceAttrObs.disconnect();
			wrapper._aceAttrObs = null;
		}
		if ( wrapper && wrapper._aceGLEffect ) {
			wrapper._aceGLEffect.destroy();
			wrapper._aceGLEffect = null;
			wrapper._aceGLType = null;
		}
	}

	function mountBtnEffect( wrapper ) {
		var type = getTypeFromWrapper( wrapper );
		var link;
		var canvas;
		var cfg;
		var effect = null;

		if ( ! type ) {
			return;
		}
		if ( wrapper._aceGLType === type && wrapper._aceGLEffect ) {
			return;
		}

		if ( wrapper._aceGLEffect ) {
			wrapper._aceGLEffect.destroy();
			wrapper._aceGLEffect = null;
			wrapper._aceGLType = null;
		}

		link = wrapper.querySelector( '.wp-block-button__link' );
		if ( ! link ) {
			return;
		}

		forEachNode( link.querySelectorAll( '.ace-btn-gl-canvas' ), function ( existingCanvas ) {
			if ( existingCanvas.parentNode === link ) {
				link.removeChild( existingCanvas );
			}
		} );

		cfg = {
			palette:          wrapper.dataset.aceAuroraPalette || 'aurora',
			auroraIntensity:  parseFloat( wrapper.dataset.aceAuroraIntensity ) || 1.2,
			auroraSpeed:      parseFloat( wrapper.dataset.aceAuroraSpeed ) || 1.0,
			auroraBands:      parseFloat( wrapper.dataset.aceAuroraBands ) || 5.0,
			neonScheme:       wrapper.dataset.aceNeonScheme || 'cyan',
			neonDensity:      parseFloat( wrapper.dataset.aceNeonDensity ) || 8.0,
			neonGlow:         parseFloat( wrapper.dataset.aceNeonGlow ) || 1.2,
			neonSparks:       wrapper.dataset.aceNeonSparks || 'medium',
			prismSpeed:       parseFloat( wrapper.dataset.acePrismSpeed ) || 1.0,
			prismSpread:      parseFloat( wrapper.dataset.acePrismSpread ) || 1.0,
			plasmaSpeed:      parseFloat( wrapper.dataset.acePlasmaSpeed ) || 1.0,
			plasmaTurbulence: parseFloat( wrapper.dataset.acePlasmaTurbulence ) || 1.0,
			infernoIntensity: parseFloat( wrapper.dataset.aceInfernoIntensity ) || 1.0,
			infernoColor:     wrapper.dataset.aceInfernoColor || 'hot',
			infernoWhips:     wrapper.dataset.aceInfernoWhips || 'normal',
			blendBg:          wrapper.dataset.aceBlendBg != null ? parseFloat( wrapper.dataset.aceBlendBg ) : 1.0,
			blendMode:        wrapper.dataset.aceBlendMode || '',
		};

		canvas = document.createElement( 'canvas' );
		canvas.className = 'ace-btn-gl-canvas';
		canvas.setAttribute( 'aria-hidden', 'true' );
		canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border-radius:inherit;pointer-events:none;z-index:-1;';
		if ( cfg.blendBg != null && cfg.blendBg < 1.0 ) {
			canvas.style.opacity = cfg.blendBg;
		}
		if ( cfg.blendMode ) {
			canvas.style.mixBlendMode = cfg.blendMode;
		}
		link.insertBefore( canvas, link.firstChild );

		if ( type === 'aurora' ) {
			effect = createAuroraBtnEffect( canvas, link, cfg );
		} else if ( type === 'neon' ) {
			effect = createNeonBtnEffect( canvas, link, cfg );
		} else if ( type === 'prism' ) {
			effect = createPrismBtnEffect( canvas, link, cfg );
		} else if ( type === 'plasma' ) {
			effect = createPlasmaBtnEffect( canvas, link, cfg );
		} else if ( type === 'inferno' ) {
			effect = createInfernoBtnEffect( canvas, link, wrapper, cfg );
		}

		if ( effect ) {
			wrapper._aceGLEffect = effect;
			wrapper._aceGLType = type;
		} else if ( canvas.parentNode ) {
			canvas.parentNode.removeChild( canvas );
		}

		if ( effect && window.MutationObserver ) {
			if ( wrapper._aceAttrObs ) { wrapper._aceAttrObs.disconnect(); }
			wrapper._aceAttrObs = new MutationObserver( function () {
				destroyWrapperEffect( wrapper );
				setTimeout( function () { mountBtnEffect( wrapper ); }, 10 );
			} );
			wrapper._aceAttrObs.observe( wrapper, {
				attributes: true,
				attributeFilter: [
					'data-ace-aurora-palette', 'data-ace-aurora-intensity', 'data-ace-aurora-speed', 'data-ace-aurora-bands',
					'data-ace-neon-scheme', 'data-ace-neon-density', 'data-ace-neon-glow', 'data-ace-neon-sparks',
					'data-ace-prism-speed', 'data-ace-prism-spread',
					'data-ace-plasma-speed', 'data-ace-plasma-turbulence',
					'data-ace-inferno-intensity', 'data-ace-inferno-color', 'data-ace-inferno-whips',
					'data-ace-blend-bg', 'data-ace-blend-mode',
				],
			} );
		}
	}

	function scanAndMount() {
		forEachNode( document.querySelectorAll( WEBGL_SELECTOR ), function ( el ) {
			mountBtnEffect( el );
		} );
	}

	if ( window.MutationObserver ) {
		new MutationObserver( function ( mutations ) {
			mutations.forEach( function ( mutation ) {
				if ( mutation.type === 'childList' ) {
					mutation.addedNodes.forEach( function ( node ) {
						if ( node.nodeType !== 1 ) {
							return;
						}
						if ( node.classList && getTypeFromWrapper( node ) ) {
							setTimeout( function () {
								mountBtnEffect( node );
							}, 50 );
						} else if ( node.querySelectorAll ) {
							setTimeout( function () {
								forEachNode( node.querySelectorAll( WEBGL_SELECTOR ), mountBtnEffect );
							}, 50 );
						}
					} );
					mutation.removedNodes.forEach( function ( node ) {
						if ( node.nodeType !== 1 ) {
							return;
						}
						if ( node._aceGLEffect ) {
							node._aceGLEffect.destroy();
							node._aceGLEffect = null;
							node._aceGLType = null;
						}
						if ( node.querySelectorAll ) {
							forEachNode( node.querySelectorAll( WEBGL_SELECTOR ), destroyWrapperEffect );
						}
					} );
				}
			} );
		} ).observe( document.body, { childList: true, subtree: true } );
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', scanAndMount );
	} else {
		scanAndMount();
	}
} )();
