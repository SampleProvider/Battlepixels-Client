@group(0) @binding(0) var below_texture: texture_2d<f32>;
@group(0) @binding(1) var above_texture: texture_2d<f32>;
@group(0) @binding(2) var water_texture: texture_2d<f32>;
@group(0) @binding(3) var background_offscreen_texture: texture_2d<f32>;
@group(0) @binding(4) var below_offscreen_texture: texture_2d<f32>;
@group(0) @binding(5) var<uniform> viewport: vec2<f32>;
@group(0) @binding(6) var<uniform> camera: vec4<f32>;
@group(0) @binding(7) var<uniform> time: f32;

@vertex
fn vs_main(@location(0) pos: vec2<f32>) -> @builtin(position) vec4<f32> {
    return vec4<f32>(pos, 0.0, 1.0);
}

@fragment
fn fs_main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let map_size = textureDimensions(water_texture);
    var map_pos = (pos.xy / camera.zw - camera.xy);
    // if (map_pos.x < 0 || u32(map_pos.x) >= map_size.x || map_pos.y < 0 || u32(map_pos.y) >= map_size.y) {
    //     discard;
    // }

    var water_pos = pos.xy;
    water_pos.x += sin(time / 1000 * 3 + map_pos.x / 8 + map_pos.y / 8) * camera.z;
    water_pos.y += sin(time / 1000 * 5 + map_pos.x / 8 + map_pos.y / 8) / 2 * camera.w;
    var water_map_pos = (water_pos.xy / camera.zw - camera.xy);
    // water_pos = clamp(water_pos, vec2<f32>(0, 0), viewport);
    // water_map_pos = clamp(water_map_pos, vec2<f32>(0, 0), vec2<f32>(map_size));
    // var pos3 = clamp(vec2<u32>(u32(water_pos.x), u32(water_pos.y)), vec2<u32>(0, 0), texture_size2);
    // var map_pos = (vec2<f32>(1171.0, 595.0) / camera.zw - camera.xy);
    // var map_pos = (vec2<f32>(1171.0, 595.0) / vec2<f32>(8, 8) - camera.xy);
    // var map_pos = (vec2<f32>(1171.0, 595.0) / vec2<f32>(8, 8) - camera.xy);
    // var map_pos = vec2<f32>(73.31252581596468, 895.9372096299004);
    // return textureLoad(below_offscreen_texture, vec2<u32>(u32(map_pos.x), u32(map_pos.y)));
    // return textureLoad(below_offscreen_texture, vec2<u32>(u32(pos.x), u32(pos.y)));
    let level = 0;
    var color = textureLoad(background_offscreen_texture, vec2<u32>(u32(pos.x), u32(pos.y)), level);
    color = blend(color, textureLoad(below_texture, vec2<u32>(u32(map_pos.x), u32(map_pos.y)), level));
    var below_offscreen_color = textureLoad(below_offscreen_texture, vec2<u32>(u32(pos.x), u32(pos.y)), level);
    var new_pos2 = (water_pos.xy / camera.zw - camera.xy);
    new_pos2 = clamp(new_pos2, vec2<f32>(0, 0), vec2<f32>(map_size));
    var water = textureLoad(water_texture, vec2<u32>(u32(new_pos2.x), u32(new_pos2.y)), level);
    if (water.w != 0) {
        color = textureLoad(background_offscreen_texture, vec2<u32>(u32(water_pos.x), u32(water_pos.y)), level);
        color = blend(color, textureLoad(below_texture, vec2<u32>(u32(water_map_pos.x), u32(water_map_pos.y)), level));
        color = blend(color, below_offscreen_color);
        color = blend(color, water);
    }
    else {
        color = blend(color, below_offscreen_color);
    }
    color = blend(color, textureLoad(above_texture, vec2<u32>(u32(map_pos.x), u32(map_pos.y)), level));
    return color;
    // return textureLoad(below_offscreen_texture, map_pos);
    // var color = textureLoad(light_texture, vec2<u32>(u32(map_pos.x), u32(map_pos.y)));
    // return blend(vec4<f32>(0.0, 0.0, 0.0, 0.5), color);
}

fn blend(color1: vec4<f32>, color2: vec4<f32>) -> vec4<f32> {
    if (color1.a == 0) {
        return color2;
    }
    // return vec4<f32>((color1.r * color1.a + color2.r * color2.a - color1.r * color1.a * color2.a) / color1.a, (color1.g * color1.a + color2.g * color2.a - color1.g * color1.a * color2.a) / color1.a, (color1.b * color1.a + color2.b * color2.a - color1.b * color1.a * color2.a) / color1.a, color1.a + color2.a - color1.a * color2.a);
    // let alpha = color1.a - color2.a * 4;
    // return vec4<f32>((color1.r * color1.a + color2.r * color2.a) / alpha, (color1.g * color1.a + color2.g * color2.a) / alpha, (color1.b * color1.a + color2.b * color2.a) / alpha, alpha);
    // return vec4<f32>((color1.r + color2.r * color2.a - color1.r * color2.a) / color1.a, (color1.g + color2.g * color2.a - color1.g * color2.a) / color1.a, (color1.b + color2.b * color2.a - color1.b * color2.a) / color1.a, color1.a + color2.a - color1.a * color2.a);
    return vec4<f32>((color1.r * color1.a + color2.r * color2.a - color1.r * color1.a * color2.a), (color1.g * color1.a + color2.g * color2.a - color1.g * color1.a * color2.a), (color1.b * color1.a + color2.b * color2.a - color1.b * color1.a * color2.a), color1.a + color2.a - color1.a * color2.a);
    // var color = mix(color1, color2, color2.a);
    // color.a = color1.a + color2.a - color1.a * color2.a;
    // return color;
}