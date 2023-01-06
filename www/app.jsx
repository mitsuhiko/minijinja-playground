import React, { useState } from "react";
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

const Editor = ({
  template,
  templateContext,
  isHtml,
  onTemplateChange,
  onTemplateContextChange,
  onToggleHtml,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [mouseBase, setMouseBase] = useState(0);
  const [width, setWidth] = useState(350);
  const [widthBase, setWidthBase] = useState(0);

  return (
    <div
      style={{ display: "flex", height: "60vh" }}
      onMouseMove={(e) => {
        if (isDragging) {
          const newWidth = widthBase - (e.pageX - mouseBase);
          setWidth(newWidth);
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
          minWidth: "3px",
          maxWidth: "3px",
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
        <label
          style={{
            position: "absolute",
            right: "10px",
            top: "10px",
            zIndex: 1000
          }}
        >
          <input
            type="checkbox"
            checked={isHtml}
            onChange={(evt) => onToggleHtml(evt.target.checked)}
          />
          HTML Mode
        </label>
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

const Output = ({ result, error }) => {
  return (
    <pre
      style={{
        background: error ? "#590523" : "rgb(41, 74, 119)",
        color: "white",
        margin: "0",
        padding: "12px 16px",
        wordWrap: "normal",
        whiteSpace: "pre-wrap",
        overflow: "auto",
        height: "calc(40vh - 24px)",
        font: '"Monaco", "Menlo", "Ubuntu Mono", "Consolas", "source-code-pro", monospace',
        fontSize: FONT_SIZE + "px",
      }}
    >
      {(result || error || "") + ""}
    </pre>
  );
};

export function App({}) {
  const [isHtml, setIsHtml] = useState(true);
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [templateContext, setTemplateContext] = useState(() =>
    JSON.stringify(DEFAULT_CONTEXT, null, 2)
  );

  let result;
  let error;
  let templateName = isHtml ? "template.html" : "template.txt";
  try {
    result = wasm
      .create_env({
        [templateName]: template,
      })
      .render(templateName, JSON.parse(templateContext));
  } catch (err) {
    error = err;
  }

  return (
    <div>
      <Editor
        template={template}
        templateContext={templateContext}
        onTemplateChange={setTemplate}
        onTemplateContextChange={setTemplateContext}
        isHtml={isHtml}
        onToggleHtml={setIsHtml}
      />
      <Output result={result} error={error} />
    </div>
  );
}
