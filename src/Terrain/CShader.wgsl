@group(0) @binding(0) var dest: texture_2d<rgba8unorm, write>;

@stage(compute) @workgroup_size(1, 1, 1)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>)
{
    textureStore(dest, vec2<i32>(global_id.xy), vec4<f32>(1.0, 0.0, 0.0, 1.0));
}