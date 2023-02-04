
@group(0) @binding(0) var mySampler: sampler;
@group(0) @binding(1) var myTexture: texture_2d<f32>;

struct VertexIn
{
    @location(0) vPos : vec2<f32>,
    @location(1) vUV : vec2<f32>
};

struct VertexOut
{
    @builtin(position) Position: vec4<f32>,
    @location(0) uv: vec2<f32>
};

@vertex
fn vs_main(in: VertexIn) -> VertexOut 
{
    var out : VertexOut;
    out.Position = vec4<f32>(in.vPos.xy, 0.0, 1.0);
    out.uv = in.vUV;
    return out;
}

@fragment
fn fs_main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
    return textureSample(myTexture, mySampler, uv);
}