

struct MVPUniformData
{
    modelview: mat4x4<f32>,
    proj: mat4x4<f32>,
    modelviewInv: mat4x4<f32>,
    projInv: mat4x4<f32>,
};

struct VertexIn
{
    @location(0) vPosition: vec3<f32>,
    @location(1) vNormal: vec3<f32>,
    @location(2) vUV: vec2<f32>,
};

struct VertexOut
{
    @builtin(position) Position: vec4<f32>,
    @location(0) color: vec3<f32>,
    @location(1) uv: vec2<f32>
};

@group(0) @binding(0) var<uniform> MVP : MVPUniformData;
@group(0) @binding(1) var mySampler: sampler;
@group(0) @binding(2) var myTexture: texture_2d<f32>;

fn normal2color(n: vec3<f32>) -> vec3<f32>
{
    let color =  (transpose(MVP.modelview) * vec4<f32>(n, 0.0) + 1.0) * 0.5;
    return vec3<f32>(color.rgb);
}

@vertex
fn vs_main(in : VertexIn)-> VertexOut
{
    var out : VertexOut;
    out.Position = MVP.proj * MVP.modelview * vec4<f32>(in.vPosition, 1.0);
    out.color = normal2color(in.vNormal);
    out.uv = in.vUV;
    return out;
}

@fragment
fn fs_main(@location(0) color: vec3<f32>, @location(1) uv: vec2<f32>) -> @location(0) vec4<f32>
{
    let nColor = vec4<f32>(color, 1.0);
    return (textureSample(myTexture, mySampler, vec2(uv.x, 1.0 - uv.y)) + nColor) * 0.5;
}