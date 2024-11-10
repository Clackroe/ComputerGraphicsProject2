var canvas;
var gl;

var program;
var vertexShader, fragmentShader;

var delay = 200;

var NumTeapotIndicesLength = teapot_indices.length;

var teapot_vert_cols = [];

var vBuffer, cBuffer, iBuffer;
var vColor, vPosition;

var viewMatricies = [];
var projectionMTX;

var cameras = [];
var currentCamera;

var M_comp_loc;
var M_view_loc;
var M_proj_loc;

var M_comp = mat4();

// all initializations
window.onload = function init() {
  canvas = document.getElementById("gl-canvas");
  gl = initWebGL(canvas);
  if (!gl) {
    alert("WebGL isn't available");
  }

  // Setup Cameras
  var cameraSize = 1;
  var left = -cameraSize;
  var right = cameraSize;
  var top = cameraSize;
  var bottom = -cameraSize;
  var near = -10;
  var far = 10;

  projectionMTX = ortho(left, right, bottom, top, near, far);
  viewMatricies = buildViewMatricies();
  viewMatricies.forEach((v) => {
    cameras.push(matMult(projectionMTX, v));
  });
  currentCamera = cameras[0];
  //

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.8, 0.8, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  program = initShaders(gl, "vertex-shader", "fragment-shader");
  gl.useProgram(program);

  teapot_vert_cols = getTeapotColors();

  vBuffer = gl.createBuffer();
  cBuffer = gl.createBuffer();
  iBuffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(teapot_vertices), gl.STATIC_DRAW);

  vPosition = gl.getAttribLocation(program, "vPosition");
  gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vPosition);

  gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(teapot_vert_cols), gl.STATIC_DRAW);

  vColor = gl.getAttribLocation(program, "vColor");
  gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vColor);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(teapot_indices),
    gl.STATIC_DRAW,
  );

  M_comp_loc = gl.getUniformLocation(program, "M_comp");
  M_viwProj_loc = gl.getUniformLocation(program, "uViewProj");

  // Find center of teapot
  var center = calculateMeshCenter(teapot_vertices);
  M_comp = matMult(
    scale4x4(0.01, 0.01, 0.01),
    translate4x4(-center[0], -center[1], -center[2]),
  );
  //
  gl.uniformMatrix4fv(M_comp_loc, false, flatten(M_comp));

  gl.uniformMatrix4fv(M_viwProj_loc, false, flatten(currentCamera));

  gl.enable(gl.DEPTH_TEST);

  render();
};

function render() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.drawElements(gl.TRIANGLES, NumTeapotIndicesLength, gl.UNSIGNED_SHORT, 0);

  setTimeout(function () {
    requestAnimFrame(render);
  }, delay);
}

function getTeapotColors() {
  let cols = [];
  for (let k = 0; k < teapot_vertices.length; k++)
    cols.push(Math.random(), Math.random(), Math.random(), 1);

  return cols;
}

function calculateMeshCenter(vertices) {
  minX = 9999;
  minY = 9999;
  maxX = -9999;
  maxY = -9999;
  minZ = 9999;
  maxZ = -9999;

  vertices.forEach((v) => {
    if (v[0] < minX) {
      minX = v[0];
    }
    if (v[0] > maxX) {
      maxX = v[0];
    }

    if (v[1] < minY) {
      minY = v[1];
    }
    if (v[1] > maxY) {
      maxY = v[1];
    }

    if (v[2] < minZ) {
      minZ = v[2];
    }
    if (v[2] > maxZ) {
      maxZ = v[2];
    }
  });

  var centerX = minX + (maxX - minX) / 2;
  var centerY = minY + (maxY - minY) / 2;
  var centerZ = minZ + (maxZ - minZ) / 2;

  return [centerX, centerY, centerZ];
}

var cameraInfo = [
  [
    [1, 0, 0],
    [1, 1, 0],
  ],

  [
    [-1, 0, 0],
    [-1, 1, 0],
  ],

  [
    [0, 1, 0],
    [0, 1, -1],
  ],

  [
    [0, -1, 0],
    [0, -1, -1],
  ],

  [
    [0, 0, 1],
    [0, 1, 1],
  ],

  [
    [0, 0, -1],
    [0, 1, -1],
  ],

  [
    [-1, 1, 1],
    [-1, 2, 1],
  ],

  [
    [1, 1, 1],
    [1, 2, 1],
  ],
];

function buildViewMatrix(eye, up, at) {
  const views = [];

  cameraInfo.forEach((info) => {
    var eye = info[0];
    var at = [0, 0, 0];
    var up = normalize(info[1]);

    var LAT = normalize(sub(at, eye));

    var U = normalize(cross_product(LAT, up));
    var V = normalize(cross_product(U, LAT));
    var N = normalize(negate(LAT));

    var M = [
      [U[0], U[1], U[2], 0],
      [V[0], V[1], V[2], 0],
      [N[0], N[1], N[2], 0],
      [0, 0, 0, 1],
    ];

    var viewMatrix = matMult(M, translate4x4(-eye[0], -eye[1], -eye[2]));

    views.push(viewMatrix);
  });

  return views;
}

function persp() {}

function sub(u, v) {
  if (!Array.isArray(u) || u.length < 3) {
    console.log("Incorrect input format.");
    return;
  }

  if (!Array.isArray(v) || v.length < 3) {
    console.log("Incorrect input format.");
    return;
  }

  let result = [u[0] - v[0], u[1] - v[1], u[2] - v[2]];

  return result;
}
