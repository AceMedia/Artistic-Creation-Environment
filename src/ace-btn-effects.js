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
		'float fbm(vec2 p){',
		'  float v=0.0,a=0.5;',
		'  for(int i=0;i<5;i++){v+=a*snoise(p);p*=2.0;a*=0.5;}',
		'  return v;',
		'}',
		'void main(){',
		'  vec2 uv=gl_FragCoord.xy/u_res;',
		'  float t=u_time*0.45;',
		'  float heat=exp(-pow((u_pointer.x-uv.x)*4.0,2.0))*exp(-pow((u_pointer.y-uv.y)*5.0,2.0))*0.7;',
		'  vec2 p=vec2(uv.x*2.8,uv.y*3.5-t);',
		'  float turb=0.0;',
		'  turb+=0.500*abs(snoise(p));',
		'  turb+=0.250*abs(snoise(p*2.02));',
		'  turb+=0.125*abs(snoise(p*4.07));',
		'  turb+=0.063*abs(snoise(p*8.13));',
		'  float mask=pow(clamp(1.0-uv.y,0.0,1.0),1.2)*1.7+heat;',
		'  float fire=clamp(turb*mask,0.0,1.0);',
		'  vec3 col;',
		'  if(fire<0.22)      col=mix(vec3(0.0),vec3(0.42,0.0,0.0),fire/0.22);',
		'  else if(fire<0.44) col=mix(vec3(0.42,0.0,0.0),vec3(0.88,0.12,0.0),(fire-0.22)/0.22);',
		'  else if(fire<0.66) col=mix(vec3(0.88,0.12,0.0),vec3(1.0,0.55,0.0),(fire-0.44)/0.22);',
		'  else if(fire<0.85) col=mix(vec3(1.0,0.55,0.0),vec3(1.0,0.88,0.05),(fire-0.66)/0.19);',
		'  else               col=mix(vec3(1.0,0.88,0.05),vec3(1.0,0.97,0.85),(fire-0.85)/0.15);',
		'  gl_FragColor=vec4(col,1.0);',
		'}',
	].join( '\n' );

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
			gl.uniform1f( uIntensity, 1.2 );
			gl.uniform1f( uSpeed, 1.0 );
			gl.uniform1f( uBands, 5.0 );
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

		return {
			destroy: function () {
				if ( destroyed ) {
					return;
				}
				destroyed = true;
				if ( frameHandle ) {
					cancelAnimationFrame( frameHandle );
					frameHandle = 0;
				}
				link.removeEventListener( 'mousemove', onPointerMove, true );
				link.removeEventListener( 'touchmove', onPointerMove, true );
				gl.deleteProgram( program );
				gl.deleteBuffer( buf );
				if ( canvas.parentNode ) {
					canvas.parentNode.removeChild( canvas );
				}
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
			gl.uniform1f( uSpeed, 1.0 );
			gl.uniform1f( uLineDensity, 8.0 );
			gl.uniform1i( uScheme, scheme );
			gl.uniform1f( uPointerInfluence, 0.6 );
			gl.uniform1f( uGlow, 1.2 );
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

		return {
			destroy: function () {
				if ( destroyed ) {
					return;
				}
				destroyed = true;
				if ( frameHandle ) {
					cancelAnimationFrame( frameHandle );
					frameHandle = 0;
				}
				link.removeEventListener( 'mousemove', onPointerMove, true );
				link.removeEventListener( 'touchmove', onPointerMove, true );
				gl.deleteProgram( program );
				gl.deleteBuffer( buf );
				if ( canvas.parentNode ) {
					canvas.parentNode.removeChild( canvas );
				}
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

		return {
			destroy: function () {
				if ( destroyed ) {
					return;
				}
				destroyed = true;
				if ( frameHandle ) {
					cancelAnimationFrame( frameHandle );
					frameHandle = 0;
				}
				link.removeEventListener( 'mousemove', onPointerMove, true );
				link.removeEventListener( 'touchmove', onPointerMove, true );
				gl.deleteProgram( program );
				gl.deleteBuffer( buf );
				if ( canvas.parentNode ) {
					canvas.parentNode.removeChild( canvas );
				}
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

		return {
			destroy: function () {
				if ( destroyed ) {
					return;
				}
				destroyed = true;
				if ( frameHandle ) {
					cancelAnimationFrame( frameHandle );
					frameHandle = 0;
				}
				link.removeEventListener( 'mousemove', onPointerMove, true );
				link.removeEventListener( 'touchmove', onPointerMove, true );
				gl.deleteProgram( program );
				gl.deleteBuffer( buf );
				if ( canvas.parentNode ) {
					canvas.parentNode.removeChild( canvas );
				}
			},
		};
	}

	function createInfernoBtnEffect( canvas, link, cfg ) {
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

		return {
			destroy: function () {
				if ( destroyed ) {
					return;
				}
				destroyed = true;
				if ( frameHandle ) {
					cancelAnimationFrame( frameHandle );
					frameHandle = 0;
				}
				link.removeEventListener( 'mousemove', onPointerMove, true );
				link.removeEventListener( 'touchmove', onPointerMove, true );
				gl.deleteProgram( program );
				gl.deleteBuffer( buf );
				if ( canvas.parentNode ) {
					canvas.parentNode.removeChild( canvas );
				}
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

		canvas = document.createElement( 'canvas' );
		canvas.className = 'ace-btn-gl-canvas';
		canvas.setAttribute( 'aria-hidden', 'true' );
		canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border-radius:inherit;pointer-events:none;z-index:-1;';
		link.insertBefore( canvas, link.firstChild );

		cfg = {
			palette: wrapper.dataset.aceAuroraPalette || 'aurora',
			neonScheme: wrapper.dataset.aceNeonScheme || 'cyan',
		};

		if ( type === 'aurora' ) {
			effect = createAuroraBtnEffect( canvas, link, cfg );
		} else if ( type === 'neon' ) {
			effect = createNeonBtnEffect( canvas, link, cfg );
		} else if ( type === 'prism' ) {
			effect = createPrismBtnEffect( canvas, link, cfg );
		} else if ( type === 'plasma' ) {
			effect = createPlasmaBtnEffect( canvas, link, cfg );
		} else if ( type === 'inferno' ) {
			effect = createInfernoBtnEffect( canvas, link, cfg );
		}

		if ( effect ) {
			wrapper._aceGLEffect = effect;
			wrapper._aceGLType = type;
		} else if ( canvas.parentNode ) {
			canvas.parentNode.removeChild( canvas );
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
