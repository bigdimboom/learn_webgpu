
struct VertexOut
{
    @builtin(position) Position: vec4<f32>,
    @location(0) fragColor: vec3<f32>
};

@vertex
fn vs_main(@builtin(vertex_index) VertexIndex : u32) -> VertexOut {
    var pos = array<vec2<f32>, 3>(
	    vec2<f32>(0.0, 0.5),
	    vec2<f32>(-0.5, -0.5),
	    vec2<f32>(0.5, -0.5)
    );

    var clr = array<vec3<f32>, 3>(
	    vec3<f32>(1.0, 0.0, 0.0),
	    vec3<f32>(0.0, 1.0, 0.0),
	    vec3<f32>(0.0, 0.0, 1.0)
    );

    var out : VertexOut;
    out.Position = vec4<f32>(pos[VertexIndex], 0.0, 1.0);
    out.fragColor = clr[VertexIndex];
    return out;
}

@fragment
fn fs_main(@location(0) fragColor: vec3<f32>) -> @location(0) vec4<f32> {
    return vec4<f32>(fragColor.rgb, 1.0);
}