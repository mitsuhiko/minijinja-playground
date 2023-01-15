use std::collections::HashMap;
use wasm_bindgen::prelude::*;

use minijinja::machinery;
use minijinja::{Environment, Source};

#[wasm_bindgen]
pub fn set_panic_hook() {
    // When the `console_error_panic_hook` feature is enabled, we can call the
    // `set_panic_hook` function at least once during initialization, and then
    // we will get better error messages if our code ever panics.
    //
    // For more details see
    // https://github.com/rustwasm/console_error_panic_hook#readme
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

#[wasm_bindgen]
pub struct JsExposedEnv {
    env: Environment<'static>,
}

fn annotate_error(err: minijinja::Error) -> JsError {
    JsError::new(&format!("{:#}", err))
}

#[wasm_bindgen]
impl JsExposedEnv {
    pub fn render(&self, template: &str, context: JsValue) -> Result<String, JsError> {
        let tmpl = self.env.get_template(template).map_err(annotate_error)?;
        let context: serde_json::Value = serde_wasm_bindgen::from_value(context)?;
        Ok(tmpl.render(context).map_err(annotate_error)?)
    }
}

#[wasm_bindgen]
pub fn create_env(templates: JsValue) -> Result<JsExposedEnv, JsError> {
    let templates: HashMap<String, String> = serde_wasm_bindgen::from_value(templates)?;
    let mut env = Environment::new();
    env.set_debug(true);
    let mut source = Source::new();
    for (name, template) in templates.into_iter() {
        source
            .add_template(name, template)
            .map_err(annotate_error)?;
    }
    env.set_source(source);
    Ok(JsExposedEnv { env })
}

#[wasm_bindgen]
pub fn tokenize(template: &str) -> Result<JsValue, JsError> {
    let mut rv = Vec::new();
    for result in machinery::tokenize(template, false) {
        let (token, span) = result?;
        rv.push((token, span));
    }
    Ok(serde_wasm_bindgen::to_value(&rv)?)
}

#[wasm_bindgen]
pub fn parse(template: &str) -> Result<JsValue, JsError> {
    let ast = machinery::parse(template, "<string>").map_err(annotate_error)?;
    Ok(serde_wasm_bindgen::to_value(&ast)?)
}

#[wasm_bindgen]
pub fn instructions(template: &str) -> Result<JsValue, JsError> {
    let tmpl = machinery::CompiledTemplate::from_name_and_source("<stirng>", template)
        .map_err(annotate_error)?;
    Ok(serde_wasm_bindgen::to_value(
        &(0..tmpl.instructions.len())
            .map(|idx| tmpl.instructions.get(idx).unwrap())
            .collect::<Vec<_>>(),
    )?)
}
