import React, { useState, useEffect } from "react";
import * as wasm from "minijinja-playground";

import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-nunjucks";
import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/theme-cobalt";
import "ace-builds/src-noconflict/ext-language_tools";
import "ace-builds/src-noconflict/keybinding-vim";

wasm.set_panic_hook();

const FONT_SIZE = 13;
const TAB_SIZE = 2;
const KEYBOARD_HANDLER = undefined;
const DEFAULT_CONTEXT = {
  name: "World",
  nav: [
    { href: "/", title: "Index" },
    { href: "/help", title: "Help" },
    { href: "/about", title: "About" },
  ],
};
const DEFAULT_TEMPLATE = `\
<nav>
  <ul>
    {%- for item in nav %}
    <li><a href="{{ item.href }}">{{ item.title }}</a>
    {%- endfor %}
  </ul>
</nav>
<main>
  Hello {{ name }}!
</main>
`;

function getSetting(key, defaultValue) {
  if (!localStorage) {
    return defaultValue;
  }
  const setting = localStorage.getItem("minijinja-playground:" + key);
  if (setting === null) {
    return defaultValue;
  } else {
    return JSON.parse(setting);
  }
}

function setSetting(key, value) {
  if (localStorage) {
    try {
      localStorage.setItem(
        "minijinja-playground:" + key,
        JSON.stringify(value)
      );
    } catch (err) {}
  }
}

const Editor = ({
  template,
  templateContext,
  mode,
  onTemplateChange,
  onTemplateContextChange,
  onSetMode,
  outputHeight,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [mouseBase, setMouseBase] = useState(0);
  const [width, setWidth] = useState(() => getSetting("contextWidth", 350));
  const [widthBase, setWidthBase] = useState(0);

  return (
    <div
      style={{ display: "flex", height: `calc(100vh - ${outputHeight}px)` }}
      onMouseMove={(e) => {
        if (isDragging) {
          const newWidth = widthBase - (e.pageX - mouseBase);
          setWidth(newWidth);
          setSetting("contextWidth", 350);
        }
      }}
      onMouseUp={(e) => {
        setIsDragging(false);
        setMouseBase(0);
        setWidthBase(0);
      }}
    >
      <div style={{ flex: "1" }}>
        <AceEditor
          mode="nunjucks"
          theme="cobalt"
          fontSize={FONT_SIZE}
          showPrintMargin={false}
          showGutter={true}
          onChange={(newValue) => {
            onTemplateChange(newValue);
          }}
          keyboardHandler={KEYBOARD_HANDLER}
          width="100%"
          height="100%"
          name="templateEditor"
          highlightActiveLine={false}
          onLoad={(editor) => {
            editor.renderer.setPadding(16);
            editor.renderer.setScrollMargin(10);
          }}
          value={template}
          tabSize={TAB_SIZE}
          editorProps={{ $blockScrolling: true }}
        />
      </div>
      <div
        style={{
          flex: "1",
          minWidth: "2px",
          maxWidth: "2px",
          background: "black",
          cursor: "ew-resize",
        }}
        onMouseDown={(e) => {
          setIsDragging(true);
          setMouseBase(e.pageX);
          setWidthBase(width);
        }}
      />
      <div
        style={{
          flex: "1",
          flexBasis: width + "px",
          flexGrow: "0",
          flexShrink: "0",
        }}
      >
        <select
          style={{
            position: "absolute",
            right: "10px",
            top: "10px",
            zIndex: 1000,
          }}
          value={mode}
          onChange={(evt) => onSetMode(evt.target.value)}
        >
          <option value="html">HTML</option>
          <option value="json">JSON</option>
          <option value="text">Text</option>
        </select>
        <AceEditor
          mode="json"
          theme="cobalt"
          fontSize={FONT_SIZE}
          showPrintMargin={false}
          showGutter={false}
          onChange={(newValue) => {
            onTemplateContextChange(newValue);
          }}
          keyboardHandler={KEYBOARD_HANDLER}
          width="100%"
          height="100%"
          name="contextEditor"
          highlightActiveLine={false}
          onLoad={(editor) => {
            editor.container.style.background = "rgb(10, 24, 44)";
            editor.renderer.setPadding(16);
            editor.renderer.setScrollMargin(10);
          }}
          value={templateContext}
          tabSize={TAB_SIZE}
          editorProps={{ $blockScrolling: true }}
        />
      </div>
    </div>
  );
};

const OUTPUT_PRE_STYLES = {
  background: "rgb(41, 74, 119)",
  color: "white",
  margin: "0",
  padding: "12px 16px",
  wordWrap: "normal",
  whiteSpace: "pre-wrap",
  fontFamily: "var(--code-font-family)",
  fontSize: "var(--code-font-size)",
};

const Error = ({ error }) => {
  return (
    <pre
      style={{
        ...OUTPUT_PRE_STYLES,
        background: "#590523",
        height: "calc(100% - 24px)",
      }}
    >
      {error + ""}
    </pre>
  );
};

const RenderOutput = ({ mode, template, templateContext }) => {
  const templateName = `template.${mode}`;
  let result;
  try {
    result = wasm
      .create_env({
        [templateName]: template,
      })
      .render(templateName, JSON.parse(templateContext));
  } catch (err) {
    return <Error error={err} />;
  }
  return <pre style={OUTPUT_PRE_STYLES}>{(result || "") + ""}</pre>;
};

const TokenOutput = ({ template }) => {
  let result;
  try {
    result = wasm.tokenize(template);
  } catch (err) {
    return <Error error={err} />;
  }
  return (
    <table style={{ margin: "12px", maxWidth: "100%" }}>
      {result.map(([token, span]) => {
        return (
          <tr>
            <td>
              <code style={{ fontWeight: "bold", paddingRight: "10px" }}>
                {token.name}
              </code>
            </td>
            <td>
              {token.payload !== undefined && (
                <code style={{ fontWeight: "bold", paddingRight: "10px" }}>
                  {JSON.stringify(token.payload)}
                </code>
              )}
            </td>
            <td>
              <code>{`${span.start_line}:${span.start_col}-${span.end_line}:${span.end_col}`}</code>
            </td>
          </tr>
        );
      })}
    </table>
  );
};

const AstOutput = ({ template }) => {
  let result;
  try {
    result = wasm.parse(template);
  } catch (err) {
    return <Error error={err} />;
  }
  return (
    <pre style={OUTPUT_PRE_STYLES}>{JSON.stringify(result, false, 2)}</pre>
  );
};

const InstructionsOutput = ({ template }) => {
  let result;
  try {
    result = Array.from(wasm.instructions(template).entries());
    result.sort((a, b) => {
      return a[0].localeCompare(b[0]);
    });
  } catch (err) {
    return <Error error={err} />;
  }
  console.log(result);
  return (
    <table style={{ margin: "12px", maxWidth: "100%" }}>
      {result.map(([blockName, instructions]) => {
        return [
          <tr>
            <th colspan="3" style={{textAlign: 'left'}}>{blockName}:</th>
          </tr>,
          ...instructions.map((instr, idx) => {
            return (
              <tr>
                <td style={{ paddingRight: "10px" }}>{idx}</td>
                <td>
                  <code style={{ fontWeight: "bold", paddingRight: "10px" }}>
                    {instr.op}
                  </code>
                </td>
                <td>
                  <code>{JSON.stringify(instr.arg)}</code>
                </td>
              </tr>
            );
          }),
        ];
      })}
    </table>
  );
};

const Output = ({ mode, template, templateContext, height }) => {
  const [outputMode, setOutputMode] = useState("render");
  return (
    <div
      style={{
        wordWrap: "normal",
        height: `${height}px`,
        overflow: "auto",
      }}
    >
      <select
        style={{
          position: "absolute",
          right: "10px",
          top: `calc(100vh - ${height}px + 12px)`,
          zIndex: 1000,
        }}
        value={outputMode}
        onChange={(evt) => setOutputMode(evt.target.value)}
      >
        <option value="render">Rendered Output</option>
        <option value="tokens">Tokens</option>
        <option value="ast">AST</option>
        <option value="instructions">Instructions</option>
      </select>
      {outputMode === "render" && (
        <RenderOutput
          mode={mode}
          template={template}
          templateContext={templateContext}
        />
      )}
      {outputMode === "tokens" && <TokenOutput template={template} />}
      {outputMode === "ast" && <AstOutput template={template} />}
      {outputMode === "instructions" && (
        <InstructionsOutput template={template} />
      )}
    </div>
  );
};

export function App({}) {
  const [mode, setMode] = useState("html");
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [templateContext, setTemplateContext] = useState(() =>
    JSON.stringify(DEFAULT_CONTEXT, null, 2)
  );
  const [isDragging, setIsDragging] = useState(false);
  const [mouseBase, setMouseBase] = useState(0);
  const [outputHeightBase, setOutputHeightBase] = useState(0);
  const [outputHeight, setOutputHeight] = useState(() =>
    getSetting("outputHeight", 200)
  );

  return (
    <div
      onMouseMove={(e) => {
        if (isDragging) {
          const newHeight = outputHeightBase - (e.pageY - mouseBase);
          setOutputHeight(newHeight);
          setSetting("outputHeight", newHeight);
        }
      }}
      onMouseUp={(e) => {
        setIsDragging(false);
        setMouseBase(0);
        setOutputHeightBase(0);
      }}
    >
      <Editor
        template={template}
        templateContext={templateContext}
        onTemplateChange={setTemplate}
        onTemplateContextChange={setTemplateContext}
        mode={mode}
        onSetMode={setMode}
        outputHeight={outputHeight}
      />
      <div
        style={{
          height: "2px",
          background: "black",
          cursor: "ns-resize",
        }}
        onMouseDown={(e) => {
          setIsDragging(true);
          setMouseBase(e.pageY);
          setOutputHeightBase(outputHeight);
        }}
      />
      <Output
        mode={mode}
        template={template}
        templateContext={templateContext}
        height={outputHeight}
      />
    </div>
  );
}
