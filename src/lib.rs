use minijinja::machinery::TemplateConfig;
use minijinja::AutoEscape;
use std::collections::{BTreeMap, HashMap};
use std::sync::Arc;
use wasm_bindgen::prelude::*;

use minijinja::machinery;
use minijinja::Environment;

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
    for (name, template) in templates.into_iter() {
        env.add_template_owned(name, template)
            .map_err(annotate_error)?;
    }
    Ok(JsExposedEnv { env })
}

#[wasm_bindgen]
pub fn tokenize(template: &str) -> Result<JsValue, JsError> {
    let mut rv = Vec::new();
    for result in machinery::tokenize(template, false, Default::default(), Default::default()) {
        let (token, span) = result?;
        rv.push((token, span));
    }
    Ok(serde_wasm_bindgen::to_value(&rv)?)
}

#[wasm_bindgen]
pub fn parse(template: &str) -> Result<JsValue, JsError> {
    let ast = machinery::parse(template, "<string>", Default::default(), Default::default())
        .map_err(annotate_error)?;
    Ok(serde_wasm_bindgen::to_value(&ast)?)
}

fn convert_instructions<'a, 'source>(
    instructions: &'a machinery::Instructions<'source>,
) -> Vec<&'a machinery::Instruction<'source>> {
    (0..instructions.len())
        .map(|idx| instructions.get(idx).unwrap())
        .collect::<Vec<_>>()
}

#[wasm_bindgen]
pub fn instructions(template: &str) -> Result<JsValue, JsError> {
    let tmpl = machinery::CompiledTemplate::new(
        "<string>",
        template,
        &TemplateConfig {
            syntax_config: machinery::SyntaxConfig,
            ws_config: Default::default(),
            default_auto_escape: Arc::new(|_| AutoEscape::None),
        },
    )
    .map_err(annotate_error)?;
    let mut all = BTreeMap::new();
    all.insert("<root>", convert_instructions(&tmpl.instructions));
    for (block_name, instr) in tmpl.blocks.iter() {
        all.insert(&block_name, convert_instructions(instr));
    }

    Ok(serde_wasm_bindgen::to_value(&all)?)
}
