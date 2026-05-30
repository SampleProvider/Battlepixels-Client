@group(0) @binding(0) var occlusion_texture: texture_storage_2d<rgba32float, read_write>;
@group(0) @binding(1) var entity_occlusion_texture: texture_storage_2d<rgba32float, read_write>;
@group(0) @binding(2) var light_texture: texture_storage_2d<rgba32float, read_write>;
@group(0) @binding(3) var entity_light_texture: texture_storage_2d<rgba32float, read_write>;
@group(0) @binding(4) var<storage, read_write> lights: array<Light>;
@group(0) @binding(5) var<uniform> time: f32;
// @group(0) @binding(4) var<storage, read_write> lights: array<f32>;

struct Light {
    x: f32,
    y: f32,
    rotation: f32,
    spread: f32,
    r: f32,
    g: f32,
    b: f32,
    intensity: f32,
}

fn random(input: u32) -> f32 {
    var state = input * 747796405 + 2891336453;
    var word = ((state >> ((state >> 28) + 4)) ^ state) * 277803737;
    return f32((word >> 22) ^ word) / 4294967296;
}

@compute @workgroup_size(8, 8, 1) // To be tested
fn compute_main(@builtin(global_invocation_id) global_id: vec3<u32>, @builtin(workgroup_id) workgroup_id: vec3<u32>, @builtin(local_invocation_id) local_id: vec3<u32>) {
    let texture_size = textureDimensions(occlusion_texture);
    let workgroup_size = 8 * 8;
    let rays = 360 * 4;
    // let rays = i32(ceil(light.spread / 3.1415926 * 180 * 4));
    let length = arrayLength(&lights) / 4;
    // let light = lights[global_id.x % length];
    let light = lights[workgroup_id.x];
    // for (var i = i32(f32(rays) * f32(local_id.x) / 8); i < i32(f32(rays) * f32(local_id.x + 1) / 8); i++) {
    for (var j = 0; j < rays / workgroup_size; j++) {
        // let light = lights[id.x];
    // for (var i = i32(local_id.x); i < rays; i += 8) {
        var i: i32;
        // let light = lights[global_id.x % arrayLength(lights)];
        // i = i32(f32(rays) * f32(global_id.x / ) / 8) + j;
        // i = i32(f32(rays) * f32(global_id.y) / 8) + j;
        // i = i32(f32(rays) * f32(global_id.x / length) / f32(workgroup_size)) + j;
        // if (j % 2 == 0) {
            i = i32(f32(rays) * f32(local_id.x + local_id.y * 8) / f32(workgroup_size)) + j;
        // }
        // else {
        //     i = i32(f32(rays) * f32(7 - local_id.x) / 8) + j;
        // }
        // let i = i32(f32(rays) * f32(local_id.x) / 8) + j;
        let angle = light.rotation + (f32(i) - f32(rays - 1) / 2.0) * light.spread / f32(rays - 1);
        var x = light.x;
        var y = light.y;
        var speed_x = cos(angle);
        var speed_y = sin(angle);
        speed_x += (1 - abs(sign(speed_x))) * 1e-10;
        speed_y += (1 - abs(sign(speed_y))) * 1e-10;
        var times = 0;
        // var intensity = light.intensity * (0.8 + 0.4 * random(u32(time) + u32(i)));
        var intensity = light.intensity;
        while (times < 100) {
            let plane_x = max(sign(speed_x), -1e-2);
            let plane_y = max(sign(speed_y), -1e-2);
            let distance_x = (plane_x - (x - floor(x))) / speed_x;
            let distance_y = (plane_y - (y - floor(y))) / speed_y;
            
            var distance = min(distance_x, distance_y);

            var decay = 0.001;
            let pos = vec2<u32>(u32(x), u32(y));

            let occlusion = textureLoad(occlusion_texture, pos).a;
            decay += 0.1 * occlusion;

            // let light_color = blend(textureLoad(light_texture, pos), vec4<f32>(light.r, light.g, light.b, distance * intensity * (500.0 / f32(rays)) * (0.02 + occlusion * 0.25)));
            let light_color = blend(textureLoad(light_texture, pos), vec4<f32>(light.r, light.g, light.b, intensity * (100.0 / f32(rays)) * (0.02 + occlusion * 0.25)));
            // let light_color = blend(textureLoad(light_texture, pos), vec4<f32>(1.0, 0.8, 0.2, distance * intensity * (500.0 / f32(rays)) * (0.02 + occlusion * 0.25)));
            // let light_color = blend(textureLoad(light_texture, pos), vec4<f32>(1.0, 0.8, 0.2, min(max(distance, 0.2), 0.5) * intensity * (500.0 / f32(rays)) * (0.02 + occlusion * 0.25)));
            textureStore(light_texture, pos, light_color);
            
            let entity_occlusion = textureLoad(entity_occlusion_texture, pos).a;
            decay += 0.1 * entity_occlusion;
            
            // let entity_light_color = blend(textureLoad(entity_light_texture, pos), vec4<f32>(light.r, light.g, light.b, distance * intensity * (200.0 / f32(rays)) * (0.02 + occlusion * 0.25)));
            // textureStore(entity_light_texture, pos, entity_light_color);

            if (decay * distance >= intensity) {
                distance = intensity / decay;
                x += speed_x * distance;
                y += speed_y * distance;
                break;
            }
            intensity -= decay * distance;

            x += speed_x * distance;
            y += speed_y * distance;

            if (x < 0 || x >= f32(texture_size.x) || y < 0 || y >= f32(texture_size.y)) {
                break;
            }

            times += 1;
        }
    }
}

fn blend(color1: vec4<f32>, color2: vec4<f32>) -> vec4<f32> {
    if (color1.a == 0) {
        return color2;
    }
    // return vec4<f32>((color1.r * color1.a + color2.r * color2.a - color1.r * color1.a * color2.a) / color1.a, (color1.g * color1.a + color2.g * color2.a - color1.g * color1.a * color2.a) / color1.a, (color1.b * color1.a + color2.b * color2.a - color1.b * color1.a * color2.a) / color1.a, color1.a + color2.a - color1.a * color2.a);
    let alpha = color1.a + color2.a;
    return vec4<f32>((color1.r * color1.a + color2.r * color2.a) / alpha, (color1.g * color1.a + color2.g * color2.a) / alpha, (color1.b * color1.a + color2.b * color2.a) / alpha, alpha);
    // return vec4<f32>((color1.r + color2.r * color2.a - color1.r * color2.a) / color1.a, (color1.g + color2.g * color2.a - color1.g * color2.a) / color1.a, (color1.b + color2.b * color2.a - color1.b * color2.a) / color1.a, color1.a + color2.a - color1.a * color2.a);
    // return vec4<f32>((color1.r * color1.a + color2.r * color2.a - color1.r * color1.a * color2.a), (color1.g * color1.a + color2.g * color2.a - color1.g * color1.a * color2.a), (color1.b * color1.a + color2.b * color2.a - color1.b * color1.a * color2.a), color1.a + color2.a - color1.a * color2.a);
    // var color = mix(color1, color2, color2.a);
    // color.a = color1.a + color2.a - color1.a * color2.a;
    // return color;
}