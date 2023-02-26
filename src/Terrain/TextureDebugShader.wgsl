
@group(0) @binding(0) var mySampler: sampler;
@group(0) @binding(1) var myTexture: texture_2d<f32>;

// drawIndexed 6
// no need depth

struct VertexOut
{
    @builtin(position) Position: vec4<f32>,
    @location(0) uv: vec2<f32>
};

const POS = array<vec2<f32>, 6>(
    vec2<f32>(-1,   1), // 0
    vec2<f32>(-1,  -1), // 1
    vec2<f32>( 1,  -1), // 2
    vec2<f32>(-1,   1), // 0
    vec2<f32>( 1,  -1), // 2
    vec2<f32>( 1,   1), // 3
);
const UV = array<vec2<f32>, 6>(
    vec2<f32>(0,0), // 0
    vec2<f32>(0,1), // 1
    vec2<f32>(1,1), // 2
    vec2<f32>(0,0), // 0
    vec2<f32>(1,1), // 2
    vec2<f32>(1,0), // 3
);

@vertex
fn vs_main(@builtin(vertex_index) VertexIndex : u32) -> VertexOut 
{

    var out : VertexOut;
    out.Position = vec4<f32>(POS[VertexIndex].xy, 0.0, 1.0);
    out.uv = UV[VertexIndex].xy;
    return out;
}

@fragment
fn fs_main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
   //return vec4<f32>(0,0,1,1);
   return textureSample(myTexture, mySampler, uv);
}