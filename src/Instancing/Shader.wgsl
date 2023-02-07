
struct Camera
{
    view: mat4x4<f32>,
    proj: mat4x4<f32>,
};

struct VertexIn
{
    @location(0) vPosition: vec3<f32>,
    @location(1) vNormal: vec3<f32>,
    @builtin(instance_index) Index: u32,
};

struct VertexOut
{
    @builtin(position) Position: vec4<f32>,
    @location(0) color: vec3<f32>
};

@group(0) @binding(0) var<uniform> Cam : Camera;
@group(0) @binding(1) var<storage> Models : array<mat4x4<f32>>;

fn normal2color(n: vec3<f32>, modelview: mat4x4<f32>) -> vec3<f32>
{
    let color =  (transpose(modelview) * vec4<f32>(n, 0.0) + 1.0) * 0.5;
    return vec3<f32>(color.rgb);
}

@vertex
fn vs_main(in : VertexIn) -> VertexOut
{
    var out : VertexOut;
    out.Position = Cam.proj * Cam.view  * Models[in.Index] * vec4<f32>(in.vPosition, 1.0);
    out.color = normal2color(in.vNormal, Cam.view * Models[in.Index]);
    return out;
}

@fragment
fn fs_main(@location(0) color: vec3<f32>) -> @location(0) vec4<f32>
{
    return vec4<f32>(color, 1.0);
}