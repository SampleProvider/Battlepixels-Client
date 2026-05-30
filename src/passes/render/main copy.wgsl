@group(0) @binding(0) var light_texture: texture_storage_2d<rgba32float, read>;
@group(0) @binding(1) var entity_light_texture: texture_storage_2d<rgba32float, read>;
@group(0) @binding(2) var<uniform> viewport: vec2<f32>;
@group(0) @binding(3) var<uniform> camera: vec4<f32>;

@vertex
fn vs_main(@location(0) pos: vec2<f32>) -> @builtin(position) vec4<f32> {
    return vec4<f32>(pos, 0.0, 1.0);
}

@fragment
fn fs_main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texture_size = textureDimensions(light_texture);
    var new_pos = (pos.xy / camera.zw - camera.xy);
    // var new_pos = (vec2<f32>(1171.0, 595.0) / camera.zw - camera.xy);
    // var new_pos = (vec2<f32>(1171.0, 595.0) / vec2<f32>(8, 8) - camera.xy);
    // var new_pos = (vec2<f32>(1171.0, 595.0) / vec2<f32>(8, 8) - camera.xy);
    // var new_pos = vec2<f32>(73.31252581596468, 895.9372096299004);
    if (new_pos.x < 0 || u32(new_pos.x) >= texture_size.x || new_pos.y < 0 || u32(new_pos.y) >= texture_size.y) {
        discard;
    }
    var color = textureLoad(light_texture, vec2<u32>(u32(new_pos.x), u32(new_pos.y)));
    return blend(vec4<f32>(0.0, 0.0, 0.0, 0.5), color);
}

fn blend(color1: vec4<f32>, color2: vec4<f32>) -> vec4<f32> {
    if (color1.a == 0) {
        return color2;
    }
    // return vec4<f32>((color1.r * color1.a + color2.r * color2.a - color1.r * color1.a * color2.a) / color1.a, (color1.g * color1.a + color2.g * color2.a - color1.g * color1.a * color2.a) / color1.a, (color1.b * color1.a + color2.b * color2.a - color1.b * color1.a * color2.a) / color1.a, color1.a + color2.a - color1.a * color2.a);
    let alpha = color1.a - color2.a * 4;
    return vec4<f32>((color1.r * color1.a + color2.r * color2.a) / alpha, (color1.g * color1.a + color2.g * color2.a) / alpha, (color1.b * color1.a + color2.b * color2.a) / alpha, alpha);
    // return vec4<f32>((color1.r + color2.r * color2.a - color1.r * color2.a) / color1.a, (color1.g + color2.g * color2.a - color1.g * color2.a) / color1.a, (color1.b + color2.b * color2.a - color1.b * color2.a) / color1.a, color1.a + color2.a - color1.a * color2.a);
    // return vec4<f32>((color1.r * color1.a + color2.r * color2.a - color1.r * color1.a * color2.a), (color1.g * color1.a + color2.g * color2.a - color1.g * color1.a * color2.a), (color1.b * color1.a + color2.b * color2.a - color1.b * color1.a * color2.a), color1.a + color2.a - color1.a * color2.a);
    // var color = mix(color1, color2, color2.a);
    // color.a = color1.a + color2.a - color1.a * color2.a;
    // return color;
}