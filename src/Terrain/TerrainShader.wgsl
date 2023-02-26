struct MVPUniformData
{
    modelview: mat4x4<f32>,
    proj: mat4x4<f32>,
    modelviewInv: mat4x4<f32>,
    projInv: mat4x4<f32>,
};

struct VertexIn
{
    @builtin(vertex_index) VertexIndex : u32,
}

struct VertexOut
{
    @builtin(position) Position: vec4<f32>,
    @location(0) uv: vec2<f32>,
    @location(1) height : f32
};

@group(0) @binding(0) var<uniform> MVP : MVPUniformData;
@group(0) @binding(1) var Sampler: sampler;
@group(0) @binding(2) var HeightMap: texture_2d<f32>;
@group(0) @binding(3) var SplattingMaps: texture_2d_array<f32>;



const HEIGHT_WEIGHT : f32 = 100.0;

const Offset = vec3<f32>(0,0,0);
const CellSize = 1;
const GridRez = 256;
const Unit = 1.0 / f32(GridRez);

@vertex
fn vs_main(in : VertexIn)-> VertexOut
{
    let id = vec2<u32>(in.VertexIndex % GridRez, in.VertexIndex / GridRez);
    let pos = vec3<f32>( f32(id.x) * CellSize, 0, f32(id.y) * CellSize);;
    let uv = vec2<f32>( f32(id.x), f32(id.y)) * Unit;

    let height = textureSampleLevel(HeightMap, Sampler, uv, 0).x;
    let posElevated = vec3<f32>(pos.x,  pos.y + height * HEIGHT_WEIGHT, pos.z) + Offset;

    var out : VertexOut;
    out.Position = MVP.proj * MVP.modelview * vec4<f32>(posElevated, 1.0);
    out.uv = uv;
    out.height = posElevated.y;

    return out;
}

@fragment
fn fs_main(@location(0) uv: vec2<f32>, @location(1) height: f32) -> @location(0) vec4<f32>
{
    let alpha = textureSample(HeightMap, Sampler, uv).x;

	let grass = textureSample(SplattingMaps, Sampler, uv, 0);
    let dirt = textureSample(SplattingMaps, Sampler, uv, 1);
    let sand = textureSample(SplattingMaps, Sampler, uv, 2);
	let rock = textureSample(SplattingMaps, Sampler, uv, 3);
	let snow = textureSample(SplattingMaps, Sampler, uv, 4);

    let peak = mix(rock, snow, smoothstep(75, 100, alpha*100));
	let high = mix(sand, peak, smoothstep(50, 75, alpha*100));
    let middle = mix(dirt, high, smoothstep(25, 50, alpha*100));
    let base = mix(grass, middle, smoothstep(0, 25, alpha*100));

    return base;
}