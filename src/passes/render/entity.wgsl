@group(0) @binding(0) var entity_light_texture: texture_storage_2d<rgba8unorm, read>;
@group(0) @binding(1) var<storage> entities: array<Entity>;
@group(0) @binding(2) var<uniform> viewport: vec2<f32>;
@group(0) @binding(3) var<uniform> camera: vec4<f32>;

struct Entity {
    x: f32,
    y: f32,
    width: f32,
    height: f32,
}

@vertex
fn vs_main(@builtin @location(0) pos: vec2<f32>) -> @builtin(position) vec4<f32> {
    return vec4<f32>(pos, 0.0, 1.0);
}

@fragment
fn fs_main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let texture_size = textureDimensions(light_texture);
    var new_pos = (pos.xy / camera.zw - camera.xy);
    if (new_pos.x < 0 || u32(new_pos.x) >= texture_size.x || new_pos.y < 0 || u32(new_pos.y) >= texture_size.y) {
        discard;
    }
    return textureLoad(light_texture, vec2<u32>(u32(new_pos.x), u32(new_pos.y)));
}