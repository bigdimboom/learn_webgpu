struct Resolution
{
	width : u32,
	height: u32
};

@group(0) @binding(0) var src: texture_external;
@group(0) @binding(1) var dest: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(2) var<uniform> REZ : Resolution;


@compute @workgroup_size(1, 1, 1)
fn cs_main(@builtin(global_invocation_id) global_id: vec3<u32>)
{
	if(global_id.x >= REZ.width || global_id.y >= REZ.height)
	{
		return;
	}

	let color = textureLoad(src, vec2<u32>(global_id.xy));
	textureStore(dest, vec2<u32>(global_id.xy), vec4<f32>(color.y, color.z, color.x, 1));
}