
var gl;   // The webgl context.

var aCoords;           // Location of the coords attribute variable in the shader program.
var aCoordsBuffer;     // Buffer to hold coords.
var aNormal;           // Location of the normal uniform in the shader program.
var aNormalBuffer;     // Buffer to hold normal vectors.
var indexBuffer;       // Buffer to hold indices for gl.drawElements
var uColor;            // Location of the color uniform variable in the shader program.
var uProjection;       // Location of the projection uniform matrix in the shader program.
var uModelview;        // Location of the modelview unifirm matrix in the shader program.
var uNormalMatrix;     // Location of the normalMatrix uniform matrix in the shader program.

var projection = mat4.create();   // projection matrix
var modelview = mat4.create();    // modelview matrix
var normalMatrix = mat3.create(); // matrix, derived from modelview matrix, for transforming normal vectors

var rotator;   // A SimpleRotator object to enable rotation by mouse dragging.

var frameNumber = 0;  // frame number during animation (actually only goes up by 0.5 per frame)

var torus, sphere, cone, cylinder, disk, ring, cube;  // basic objects, created using function createModel

var show = 1;  // When this variable is 1, the entire scene is drawn; when it is 2, only the car is shown

var modelview;                  // The current modelview matrix
var matrixStack = [];           // A stack of matrices for implementing hierarchical graphics.

var currentColor = [1,1,1,1];   // The current drawing color; objects are rendered using this color.

//light stuff
var u_LightColor;
var u_LightPosition;
var u_LightPosition2;
var u_DirectionalLight;

var r=4.75;
var orangeBicycleAngle=0; // angle of the orange bicycle
var orangeBicycleSpeed=0.6;
var purpleBicycleAngle=0;
var purpleBicycleSpeed=1;
var sunlightAngle=0;
var sunlightSpeed=0.1;
var fact = Math.PI/180;

// background color
var red = 0.1;
var green = 0.3;
var blue = 0.8;

/**
 * Draws the image, which consists of either the "world" or a closeup of the "car".
 */
function draw() {
    gl.clearColor(red,green,blue,1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    mat4.perspective(projection, Math.PI/4, 1, 1, 50);			//assigns to the matrix projection the transformation with frustum
																//defined by an eye angle of 45 degrees (pi/4), ratio of width/height
																// of 1, near plane 1 and far plane 50
    gl.uniformMatrix4fv(uProjection, false, projection );		//assigns the value of the matrix projection to the uniform matrix uProjection

    modelview = rotator.getViewMatrix();						//computes the modelview from the position of the rotator
    mat3.normalFromMat4(normalMatrix, modelview);				//computes the normalMatrix (used to multiply the normals) from the modelview

    var OBX = Math.cos((orangeBicycleAngle + 22)*fact)*r;
    var OBY = Math.sin((orangeBicycleAngle + 22)*fact)*r;
    var light_vector = vec4.fromValues(OBX,0.4,OBY,1);
    mat4.multiply(light_vector,modelview,light_vector);
    gl.uniform3f(u_LightPosition,light_vector[0],light_vector[1],light_vector[2]);

    var PBX = Math.cos((purpleBicycleAngle - 26)*fact)*(r-0.7);
    var PBY = Math.sin((purpleBicycleAngle - 26)*fact)*(r-0.7);
    light_vector = vec4.fromValues(-PBX,0.3,-PBY,1);
    mat4.multiply(light_vector,modelview,light_vector);
    gl.uniform3f(u_LightPosition2,light_vector[0],light_vector[1],light_vector[2]);

    var sunX = Math.cos(sunlightAngle*fact)*(r*0.18);
    var sunZ = Math.cos(sunlightAngle*fact)*(r*0.18);
    light_vector = vec4.fromValues(sunX,sunZ,0,0);
    mat4.multiply(light_vector,modelview,light_vector);
    gl.uniform3f(u_DirectionalLight,light_vector[0],light_vector[1],light_vector[2]);

    // move the angle of the bycicles
    moveScene();
    
    if (show == 1)
        world();
    else
       car();
}

/**
 * Draws a "world" consisting of a disk holding some trees and a road, and a car that
 * drives along the road.  A tree in the middle grows from frame 0 to frame 1000.
 */
function world() {
	pushMatrix();													//creates a copy of the current top matrix of the matrix stack
	mat4.translate(modelview,modelview,[0,-0.05,0]);				//modifies the second parameter (modelview) by multiplying it with
																	//the translation matrix with parameters [0,-0.05,0] and assigns the result
																	//to the first parameter. In this case, it modifies the modelview.
	mat4.rotate(modelview,modelview,(90)/180*Math.PI,[1,0,0]);		//modifies the second parameter (modelview) by multiplying it with
																	//the rotation matrix with parameters (90)/180*Math.PI (angle of 90 degrees) and
																	//[1,0,0] (axis of rotation) and assigns the result
																	//to the first parameter. In this case, it modifies the modelview.
  mat4.scale(modelview, modelview,[1.1,1.1,0.5]);
	currentColor = [0.1,0.4,0.1,1];									//Defines the color
	disk.render();													//Renders the disk
	popMatrix();													//deletes the top matrix of the stack
	pushMatrix();
	currentColor = [0.88,0.75,0.55,1];
	mat4.rotate(modelview,modelview,(90)/180*Math.PI,[-1,0,0]);
  mat4.scale(modelview, modelview,[1.1,1.1,0.5]);
	ring.render();
	popMatrix();
  // orange bicycle
	pushMatrix();
  var OBX = Math.cos(orangeBicycleAngle*fact)*r;
  var OBY = Math.sin(orangeBicycleAngle*fact)*r;
  mat4.translate(modelview, modelview, [OBX, 0.1, OBY]);
  mat4.rotate(modelview, modelview, Math.atan2(-OBX,-OBY), [0, 1, 0]);
  mat4.scale(modelview,modelview,[0.85,0.85,0.85]);
	orangeBicycle();
	popMatrix();
  // purple bicycle
  pushMatrix();
  var PBX = Math.cos(purpleBicycleAngle*fact)*(r-0.7);
  var PBY = Math.sin(purpleBicycleAngle*fact)*(r-0.7);
  mat4.translate(modelview, modelview, [-PBX, 0.1, -PBY]);
  mat4.rotate(modelview, modelview, Math.atan2(-PBX,-PBY), [0, 1, 0]);
  mat4.scale(modelview,modelview,[0.85,0.85,0.85]);
  purpleBicycle();
  popMatrix();
  // forest 
	pushMatrix();
  forest();
  popMatrix();
}

/**
 * Draws a tree consisting of a green cone with a brown cylinder for a trunk.
 */
function tree() {
  pushMatrix();
  mat4.translate(modelview,modelview,[0,0,0]);
  mat4.scale(modelview,modelview,[0.3,0.5,0.3]);
  mat4.rotate(modelview,modelview,(90)/180*Math.PI,[-1,0,0]);
	currentColor = [0.5,0.3,0.1,1];
  cylinder.render();
  mat4.translate(modelview,modelview,[0,0,1]);
  currentColor = [0.5,0.3,0.1,1];
  cylinder.render();
  popMatrix();
  pushMatrix();
  mat4.translate(modelview,modelview,[2.2,1.5,0]);
  mat4.scale(modelview,modelview,[1.1,1.8,1.1]);
  mat4.rotate(modelview,modelview,(90)/180*Math.PI,[-1,0,0]);
	currentColor = [0,0.8,0,1];
	cone.render();
  popMatrix();
}

/**
 * Draws a bicycle consisting of a (simplified) body, two wheels 
 * and a light positioned in front.
 */
function orangeBicycle() {
  // init wheels
	pushMatrix();
  mat4.translate(modelview,modelview,[0,0.2,0.1]);
  mat4.scale(modelview,modelview,[0.3,0.3,0.3]);
  mat4.rotate(modelview,modelview,(90)/180*Math.PI,[1,0,0]);
  wheel();
  mat4.translate(modelview,modelview,[0,-0.6,0]);
  wheel();
  mat4.translate(modelview,modelview,[3.5,0.3,0]);
  wheel();
  popMatrix();
  // end wheels
  // init first cylinder
  pushMatrix();
  mat4.translate(modelview,modelview,[0.1,0.6,0]);
  mat4.scale(modelview,modelview,[0.8,0.1,0.1]);
  mat4.rotate(modelview,modelview,(90)/180*Math.PI,[0,1,0]);
  currentColor = [0.8,0.5,0,1];
  cylinder.render();
  popMatrix();
  // end first cylinder
  // init second cylinder
  pushMatrix();
  mat4.translate(modelview,modelview,[0.8,0.6,0]);
  mat4.rotate(modelview,modelview,(90)/180*Math.PI,[1,-1.8,0]);
  mat4.scale(modelview,modelview,[0.1,0.1,0.92]);
  cylinder.render();
  popMatrix();
  // end second cylinder
  // init first-couple cylinder
  pushMatrix();
  mat4.translate(modelview,modelview,[1,0.3,0.07]);
  mat4.rotate(modelview,modelview,(90)/180*Math.PI,[-1,-0.4,0]);
  mat4.scale(modelview,modelview,[0.08,0.08,0.6]);
  cylinder.render();
  popMatrix();
  // end first-couple cylinder
  // init second-couple cylinder
  pushMatrix();
  mat4.translate(modelview,modelview,[1,0.3,-0.07]);
  mat4.rotate(modelview,modelview,(90)/180*Math.PI,[-1,-0.4,0]);
  mat4.scale(modelview,modelview,[0.08,0.08,0.6]);
  cylinder.render();
  popMatrix();
  // end second-couple cylinder
  // init back cylinder
  pushMatrix();
  mat4.translate(modelview,modelview,[0.08,0.7,0]);
  mat4.rotate(modelview,modelview,(90)/180*Math.PI,[1,-0.15,0]);
  mat4.scale(modelview,modelview,[0.08,0.08,0.55]);
  cylinder.render();
  popMatrix();
  // end back cylinder
  // init manubrio cylinder
  pushMatrix();
  currentColor = [1,0.3,0,1];
  mat4.translate(modelview,modelview,[0.75,0.9,-0.3]);
  mat4.rotate(modelview,modelview,(90)/180*Math.PI,[0,0,1]);
  mat4.scale(modelview,modelview,[0.1,0.1,0.6]);
  cylinder.render();
  popMatrix();
  pushMatrix();
  mat4.translate(modelview,modelview,[0.75,0.92,0.26]);
  mat4.rotate(modelview,modelview,(90)/180*Math.PI,[1,-1,0]);
  mat4.scale(modelview,modelview,[0.07,0.07,0.3]);
  cylinder.render();
  popMatrix();
  pushMatrix();
  mat4.translate(modelview,modelview,[0.75,0.92,-0.26]);
  mat4.rotate(modelview,modelview,(90)/180*Math.PI,[1,-1,0]);
  mat4.scale(modelview,modelview,[0.07,0.07,0.3]);
  cylinder.render();
  popMatrix();
  // end manubrio cylinder
  // init sellino
  pushMatrix();
  currentColor = [0.3,0.3,0.3,1];
  mat4.translate(modelview,modelview,[0.15,0.7,-0.6]);
  mat4.rotate(modelview,modelview,(90)/180*Math.PI,[0,1,0]);
  mat4.scale(modelview,modelview,[0.3,0.1,0.3]);
  cone.render();
  popMatrix();
  // end sellino
}

function purpleBicycle() {
  // init wheels
  pushMatrix();
  mat4.translate(modelview,modelview,[0,0.2,0]);
  mat4.scale(modelview,modelview,[0.3,0.3,0.3]);
  mat4.rotate(modelview,modelview,(90)/180*Math.PI,[1,0,0]);
  wheel();
  mat4.translate(modelview,modelview,[3.5,0,0]);
  wheel();
  popMatrix();
  // end wheels
  // init first cylinder
  pushMatrix();
  mat4.translate(modelview,modelview,[0.1,0.6,0]);
  mat4.scale(modelview,modelview,[0.8,0.1,0.1]);
  mat4.rotate(modelview,modelview,(90)/180*Math.PI,[0,1,0]);
  currentColor = [0.8,0,0.8,1];
  cylinder.render();
  popMatrix();
  // end first cylinder
  // init second cylinder
  pushMatrix();
  mat4.translate(modelview,modelview,[0.8,0.6,0]);
  mat4.rotate(modelview,modelview,(90)/180*Math.PI,[1,-1.2,0]);
  mat4.scale(modelview,modelview,[0.1,0.1,0.6]);
  cylinder.render();
  popMatrix();
  // end second cylinder
  // init first-couple cylinder
  pushMatrix();
  mat4.translate(modelview,modelview,[1,0.3,0.07]);
  mat4.rotate(modelview,modelview,(90)/180*Math.PI,[-1,-0.4,0]);
  mat4.scale(modelview,modelview,[0.08,0.08,0.6]);
  cylinder.render();
  popMatrix();
  // end first-couple cylinder
  // init second-couple cylinder
  pushMatrix();
  mat4.translate(modelview,modelview,[1,0.3,-0.07]);
  mat4.rotate(modelview,modelview,(90)/180*Math.PI,[-1,-0.4,0]);
  mat4.scale(modelview,modelview,[0.08,0.08,0.6]);
  cylinder.render();
  popMatrix();
  // end second-couple cylinder
  // init back cylinder
  pushMatrix();
  mat4.translate(modelview,modelview,[0.08,0.7,-0.07]);
  mat4.rotate(modelview,modelview,(90)/180*Math.PI,[1,0.4,0]);
  mat4.scale(modelview,modelview,[0.08,0.08,0.55]);
  cylinder.render();
  popMatrix();
  // end back cylinder
  // init back cylinder
  pushMatrix();
  mat4.translate(modelview,modelview,[0.08,0.7,0.07]);
  mat4.rotate(modelview,modelview,(90)/180*Math.PI,[1,0.4,0]);
  mat4.scale(modelview,modelview,[0.08,0.08,0.55]);
  cylinder.render();
  popMatrix();
  // end back cylinder
  // init manubrio cylinder
  pushMatrix();
  currentColor = [0.2,0,0.2,1];
  mat4.translate(modelview,modelview,[0.75,0.9,-0.3]);
  mat4.rotate(modelview,modelview,(90)/180*Math.PI,[0,0,1]);
  mat4.scale(modelview,modelview,[0.1,0.1,0.6]);
  cylinder.render();
  popMatrix();
  // end manubrio cylinder
  // init sellino
  pushMatrix();
  currentColor = [0.3,0.3,0.3,1];
  mat4.translate(modelview,modelview,[0.15,0.7,-0.6]);
  mat4.rotate(modelview,modelview,(90)/180*Math.PI,[0,1,0]);
  mat4.scale(modelview,modelview,[0.3,0.1,0.3]);
  cone.render();
  popMatrix();
  // end sellino
}

/**
 * Draw a rotating wheel that consists of a torus to make the wheel.
 */
function wheel() {
	pushMatrix();
	currentColor = [0.2,0.2,0.2,1];
	mat4.rotate(modelview,modelview,(90)/180*Math.PI,[1,0,0]);
	torus.render();
	popMatrix();
}

// Making forest

function forest(){
  pushMatrix();
  mat4.translate(modelview,modelview,[-0.8,0,-0.9]);
  tree();
  popMatrix();
  pushMatrix();
  mat4.translate(modelview,modelview,[2,0,2]);
  tree();
  popMatrix();
  pushMatrix();
  mat4.translate(modelview,modelview,[1.2,0,-1.9]);
  tree();
  popMatrix();
  pushMatrix();
  mat4.translate(modelview,modelview,[2,0,2]);
  tree();
  popMatrix();
  pushMatrix();
  mat4.translate(modelview,modelview,[-2.3,0,1.1]);
  tree();
  popMatrix();
  pushMatrix();
  mat4.translate(modelview,modelview,[-4.5,0,-3.4]);
  tree();
  popMatrix();
  pushMatrix();
  mat4.translate(modelview,modelview,[4.8,0,-3]);
  tree();
  popMatrix();
  pushMatrix();
  mat4.translate(modelview,modelview,[-0.1,0,-3]);
  tree();
  popMatrix();
  pushMatrix();
  mat4.translate(modelview,modelview,[0.3,0,1.5]);
  tree();
  popMatrix();
  pushMatrix();
  mat4.translate(modelview,modelview,[-2.9,0,4.9]);
  tree();
  popMatrix();
}

function moveScene(){
  // orange bike 
  if (orangeBicycleAngle >= 359) {
    orangeBicycleAngle = 0;
  }
  else orangeBicycleAngle+=orangeBicycleSpeed;
  // purple bike
  if (purpleBicycleAngle >= 359) {
    purpleBicycleAngle = 0;
  }
  else purpleBicycleAngle-=purpleBicycleSpeed;
  if (sunlightAngle >= 359) {
    sunlightAngle = 0;
  } 
  else {
    sunlightAngle+=sunlightSpeed;
    if (sunlightAngle < 180){
      red += sunlightSpeed/360;
      blue -= sunlightSpeed/360;
    } else {
      red -= sunlightSpeed/360;
      blue += sunlightSpeed/360;
    }
  }
}

/**
 *  Push a copy of the current modelview matrix onto the matrix stack.
 */
function pushMatrix() {
    matrixStack.push( mat4.clone(modelview) );
}

/**
 *  Restore the modelview matrix to a value popped from the matrix stack.
 */
function popMatrix() {
    modelview = matrixStack.pop();
}


/**
 *  Create one of the basic objects.  The modelData holds the data for
 *  an IFS using the structure from basic-objects-IFS.js.  This function
 *  creates VBOs to hold the coordinates, normal vectors, and indices
 *  from the IFS, and it loads the data into those buffers.  The function
 *  creates a new object whose properties are the identifies of the
 *  VBOs.  The new object also has a function, render(), that can be called to
 *  render the object, using all the data from the buffers.  That object
 *  is returned as the value of the function.  (The second parameter,
 *  xtraTranslate, is there because this program was ported from a Java
 *  version where cylinders were created in a different position, with
 *  the base on the xy-plane instead of with their center at the origin.
 *  The xtraTranslate parameter is a 3-vector that is applied as a
 *  translation to the rendered object.  It is used to move the cylinders
 *  into the position expected by the code that was ported from Java.)
 */
function createModel(modelData, xtraTranslate) {
    var model = {};
    model.coordsBuffer = gl.createBuffer();
    model.normalBuffer = gl.createBuffer();
    model.indexBuffer = gl.createBuffer();
    model.count = modelData.indices.length;
    if (xtraTranslate)
        model.xtraTranslate = xtraTranslate;
    else
        model.xtraTranslate = null;
    gl.bindBuffer(gl.ARRAY_BUFFER, model.coordsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, modelData.vertexPositions, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, model.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, modelData.vertexNormals, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, modelData.indices, gl.STATIC_DRAW);
    model.render = function() {  // This function will render the object.
           // Since the buffer from which we are taking the coordinates and normals
	   // change each time an object is drawn, we have to use gl.vertexAttribPointer
	   // to specify the location of the data. And to do that, we must first
	   // bind the buffer that contains the data.  Similarly, we have to
	   // bind this object's index buffer before calling gl.drawElements.
        gl.bindBuffer(gl.ARRAY_BUFFER, this.coordsBuffer);
        gl.vertexAttribPointer(aCoords, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 0, 0);
        gl.uniform4fv(uColor, currentColor);
        if (this.xtraTranslate) {
            pushMatrix();
            mat4.translate(modelview,modelview,this.xtraTranslate);
        }
        gl.uniformMatrix4fv(uModelview, false, modelview );
        mat3.normalFromMat4(normalMatrix, modelview);
        gl.uniformMatrix3fv(uNormalMatrix, false, normalMatrix);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.drawElements(gl.TRIANGLES, this.count, gl.UNSIGNED_SHORT, 0);
        if (this.xtraTranslate) {
            popMatrix();
        }
    }
    return model;
}



/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type String is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 */
function createProgram(gl, vertexShaderSource, fragmentShaderSource) {
   var vsh = gl.createShader( gl.VERTEX_SHADER );
   gl.shaderSource(vsh,vertexShaderSource);
   gl.compileShader(vsh);
   if ( ! gl.getShaderParameter(vsh, gl.COMPILE_STATUS) ) {
      throw "Error in vertex shader:  " + gl.getShaderInfoLog(vsh);
   }
   var fsh = gl.createShader( gl.FRAGMENT_SHADER );
   gl.shaderSource(fsh, fragmentShaderSource);
   gl.compileShader(fsh);
   if ( ! gl.getShaderParameter(fsh, gl.COMPILE_STATUS) ) {
      throw "Error in fragment shader:  " + gl.getShaderInfoLog(fsh);
   }
   var prog = gl.createProgram();
   gl.attachShader(prog,vsh);
   gl.attachShader(prog, fsh);
   gl.linkProgram(prog);
   if ( ! gl.getProgramParameter( prog, gl.LINK_STATUS) ) {
      throw "Link error in program:  " + gl.getProgramInfoLog(prog);
   }
   return prog;
}


/* Gets the text content of an HTML element.  This is used
 * to get the shader source from the script elements that contain
 * it.  The parameter should be the id of the script element.
 */
function getTextContent( elementID ) {
    var element = document.getElementById(elementID);
    var fsource = "";
    var node = element.firstChild;
    var str = "";
    while (node) {
        if (node.nodeType == 3) // this is a text node
            str += node.textContent;
        node = node.nextSibling;
    }
    return str;
}


//--------------------------------- animation framework ------------------------------

window.requestAnimationFrame = 
    window.requestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    function (callback) {
        setTimeout(function() { callback(Date.now()); },  1000/60);
    }
    
var animating = true;

function frame() {
    if (animating) {
        frameNumber += 0.5;
        draw();
        requestAnimationFrame(frame);
    }
}

function setAnimating(run) {
    if (run != animating) {
        animating = run;
        if (animating)
            requestAnimationFrame(frame);
    }
}

//-------------------------------------------------------------------------

function init() {
   try {
        var canvas = document.getElementById("glcanvas");
        gl = canvas.getContext("webgl");
        if ( ! gl ) {
            gl = canvas.getContext("experimental-webgl");
        }
        if ( ! gl ) {
            throw "Could not create WebGL context.";
        }
        var vertexShaderSource = getTextContent("vshader"); 
        var fragmentShaderSource = getTextContent("fshader");
        var prog = createProgram(gl,vertexShaderSource,fragmentShaderSource);
        gl.useProgram(prog);
        aCoords =  gl.getAttribLocation(prog, "coords");
        aNormal =  gl.getAttribLocation(prog, "normal");
        uModelview = gl.getUniformLocation(prog, "modelview");
        uProjection = gl.getUniformLocation(prog, "projection");
        uColor =  gl.getUniformLocation(prog, "color");
        uNormalMatrix =  gl.getUniformLocation(prog, "normalMatrix");

        u_LightColor = gl.getUniformLocation(prog, "u_LightColor");
        var u_ViewerPosition = gl.getUniformLocation(prog, "u_ViewerPosition");
        var u_SpecularColor = gl.getUniformLocation(prog, "u_SpecularColor");
        var u_Exponent = gl.getUniformLocation(prog, "u_Exponent");
        u_LightPosition2 = gl.getUniformLocation(prog,"u_LightPosition2");
        u_LightPosition = gl.getUniformLocation(prog, "u_LightPosition");
        var u_AmbientLight = gl.getUniformLocation(prog, "u_AmbientLight");
        u_DirectionalLight = gl.getUniformLocation(prog,"u_DirectionalLight");
                
        gl.uniform3f(u_ViewerPosition,0,0,0);
        gl.uniform3f(u_LightColor, 0.8,0.7,0.7);
        // Set the ambient light
        gl.uniform3f(u_AmbientLight, 0.2, 0.2, 0.2);
        // Set the specular color (white)
        gl.uniform3f(u_SpecularColor, 0.4, 0.4, 0.4);
        // Set the ambient light
        gl.uniform1f(u_Exponent,3);

        gl.enableVertexAttribArray(aCoords);  // won't change after initialization.
        gl.enableVertexAttribArray(aNormal);  // also won't change.
        gl.enable(gl.DEPTH_TEST);
   }
   catch (e) {
      document.getElementById("message").innerHTML =
           "Could not initialize WebGL: " + e;
      return;
   }
   
   torus = createModel(uvTorus(0.5,1,16,8));   // Create all the basic objects.
   sphere = createModel(uvSphere(1));
   cone = createModel(uvCone(),[-2,0,0]);
   cylinder = createModel(uvCylinder(),[0,0,.5]);
   disk = createModel(uvCylinder(5.5,0.5,64),[0,0,.25]);
   ring = createModel(ring(3.3,4.8,40));
   cube = createModel(cube());

   rotator = new SimpleRotator(canvas,draw);
   rotator.setView( [0, 1, 2], [0,1,0], 16);
   frame();
}