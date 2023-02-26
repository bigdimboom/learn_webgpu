@group(0) @binding(0) var dest: texture_storage_2d<rgba8unorm, write>;


// const _CellSize : f32 = 20; // 1 - 100

const REZ : u32 = 256;

const _CellAmount : u32 = 4; // 1,32
const _Period : vec2<f32> = vec2<f32>(4,4);
const _Roughness : i32 = 2; // 1 - 8
const _Persistance : f32 = 0.3; // 0 - 1
const OCTAVES : i32 = 4; 



fn lerp(a: f32, b: f32, t: f32) -> f32 {
  return (1.0 - t) * a + t * b;
}

fn rand2dTo1d(value: vec2<f32>, dotDir: vec2<f32>) -> f32 {
	let smallValue = sin(value);
	var random = dot(smallValue, dotDir);
	random = fract(sin(random) * 143758.5453);
	return random;
}

fn rand2dTo2d(value : vec2<f32>) -> vec2<f32>{
    return vec2<f32>(
		rand2dTo1d(value, vec2<f32>(12.989, 78.233)),
		rand2dTo1d(value, vec2<f32>(39.346, 11.135))
	);
}

fn easeIn(interpolator : f32)->f32{
    return interpolator * interpolator;
}

fn easeOut(interpolator: f32)->f32{
	return 1 - easeIn(1 - interpolator);
}

fn easeInOut(interpolator: f32)->f32{
	let easeInValue = easeIn(interpolator);
	let easeOutValue = easeOut(interpolator);
	return lerp(easeInValue, easeOutValue, interpolator);
}

fn modulo(divident: vec2<f32>, divisor: vec2<f32>) -> vec2<f32>{
	let positiveDivident: vec2<f32> = divident % divisor + divisor;
	return positiveDivident % divisor;
}

fn perlinNoise(value:vec2<f32>, period:vec2<f32>) -> f32{
	var cellsMimimum = floor(value);
	var cellsMaximum = ceil(value);
	cellsMimimum = modulo(cellsMimimum, period);
	cellsMaximum = modulo(cellsMaximum, period);
	//generate random directions
	let lowerLeftDirection = rand2dTo2d(vec2<f32>(cellsMimimum.x, cellsMimimum.y)) * 2 - 1;
	let lowerRightDirection = rand2dTo2d(vec2<f32>(cellsMaximum.x, cellsMimimum.y)) * 2 - 1;
	let upperLeftDirection = rand2dTo2d(vec2<f32>(cellsMimimum.x, cellsMaximum.y)) * 2 - 1;
	let upperRightDirection = rand2dTo2d(vec2<f32>(cellsMaximum.x, cellsMaximum.y)) * 2 - 1;
	let fraction = fract(value);
	//get values of cells based on fraction and cell directions
	let lowerLeftFunctionValue = dot(lowerLeftDirection, fraction - vec2<f32>(0, 0));
	let lowerRightFunctionValue = dot(lowerRightDirection, fraction - vec2<f32>(1, 0));
	let upperLeftFunctionValue = dot(upperLeftDirection, fraction - vec2<f32>(0, 1));
	let upperRightFunctionValue = dot(upperRightDirection, fraction - vec2<f32>(1, 1));
	let interpolatorX = easeInOut(fraction.x);
	let interpolatorY = easeInOut(fraction.y);
	//interpolate between values
	let lowerCells = lerp(lowerLeftFunctionValue, lowerRightFunctionValue, interpolatorX);
	let upperCells = lerp(upperLeftFunctionValue, upperRightFunctionValue, interpolatorX);
	let noise = lerp(lowerCells, upperCells, interpolatorY);
	return noise;
}

fn sampleLayeredNoise(value : vec2<f32>) -> f32{

	var noise : f32 = 0;
	var frequency : f32 = 1;
	var factor : f32 = 1;
 
	for(var i:i32 = 0; i < OCTAVES; i++){
		noise = noise + perlinNoise(value * frequency + f32(i) * 0.72354, _Period * frequency) * factor;
		factor *= _Persistance;
		frequency *= f32(_Roughness);
	}
	return noise;
}

// fn perlinNoise(value: vec2<f32>)-> f32{
// 	//generate random directions
// 	let lowerLeftDirection = rand2dTo2d(vec2<f32>(floor(value.x), floor(value.y))) * 2 - 1;
// 	let lowerRightDirection = rand2dTo2d(vec2<f32>(ceil(value.x), floor(value.y))) * 2 - 1;
// 	let upperLeftDirection = rand2dTo2d(vec2<f32>(floor(value.x), ceil(value.y))) * 2 - 1;
// 	let upperRightDirection = rand2dTo2d(vec2<f32>(ceil(value.x), ceil(value.y))) * 2 - 1;
// 	let fraction = fract(value);
// 	//get values of cells based on fraction and cell directions
// 	let lowerLeftFunctionValue = dot(lowerLeftDirection, fraction - vec2<f32>(0, 0));
// 	let lowerRightFunctionValue = dot(lowerRightDirection, fraction - vec2<f32>(1, 0));
// 	let upperLeftFunctionValue = dot(upperLeftDirection, fraction - vec2<f32>(0, 1));
// 	let upperRightFunctionValue = dot(upperRightDirection, fraction - vec2<f32>(1, 1));
// 	let interpolatorX = easeInOut(fraction.x);
// 	let interpolatorY = easeInOut(fraction.y);
// 	//interpolate between values
// 	let lowerCells = lerp(lowerLeftFunctionValue, lowerRightFunctionValue, interpolatorX);
// 	let upperCells = lerp(upperLeftFunctionValue, upperRightFunctionValue, interpolatorX);
// 	let noise = lerp(lowerCells, upperCells, interpolatorY);
// 	return noise;
// }


@compute @workgroup_size(1, 1, 1)
fn cs_main(@builtin(global_invocation_id) global_id: vec3<u32>)
{
    //textureStore(dest, vec2<i32>(global_id.xy), vec4<f32>(1.0, 0.0, 0.0, 1.0));
    // let val = perlinNoise(vec2<f32>(global_id.xy) / _CellSize) + 0.5;
    // textureStore(dest, vec2<i32>(global_id.xy), vec4<f32>(vec3<f32>(val,val,val), 1.0));

	let uv = vec2<f32>(global_id.xy) / f32(REZ - 1);
	let value = uv * f32(_CellAmount);
	let noise = sampleLayeredNoise(value) + 0.5;
	textureStore(dest, vec2<i32>(global_id.xy), vec4<f32>(vec3<f32>(noise,noise,noise), 1.0));
}