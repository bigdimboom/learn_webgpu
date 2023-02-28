struct Resolution
{
	width : u32,
	height: u32
};

@group(0) @binding(0) var src: texture_external;
@group(0) @binding(1) var dest: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(2) var<uniform> REZ : Resolution;

const kernel = array<vec3<f32>, 3>(
	vec3<f32>(-1, 0, 1),
	vec3<f32>(-2, 0, 2),
	vec3<f32>(-1, 0, 1)
);

fn ToGrayScale(color : vec3<f32>) -> f32
{
	return 0.299 * color.x + 0.587 * color.y + 0.114;
}

@compute @workgroup_size(1, 1, 1)
fn cs_main(@builtin(global_invocation_id) global_id: vec3<u32>)
{
	if(global_id.x >= REZ.width || global_id.y >= REZ.height)
	{
		return;
	}
	
	//textureLoad(src, vec2<u32>(global_id.xy)).xyz
	var gs : f32 = 0;
	for(var r = -1; r < 2; r += 1)
	{
		for(var c = -1; c < 2; c +=1)
		{
			let pos = vec2<i32>(global_id.xy) + vec2<i32>(c, r);
			if(pos.x >= 0 && pos.x < i32(REZ.width) && pos.y >= 0 && pos.y < i32(REZ.height))
			{
				gs += ToGrayScale(textureLoad(src, vec2<u32>(pos.xy)).xyz) * kernel[r+1][c+1];
			}
		}
	}

	//let gs = ToGrayScale(  );

	
	textureStore(dest, vec2<u32>(global_id.xy), vec4<f32>(gs, gs, gs, 1));
}