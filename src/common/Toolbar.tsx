import { Dropdown } from "primereact/dropdown";
import { Toolbar } from "primereact/toolbar";
import { useState } from "react";
import { Pencil, MousePointerClick, Trash, Move, Share2, Ruler, Eraser } from 'lucide-react';
import { Button } from "primereact/button";

export type ConstructionMode = 'nodes' | 'edges' | 'guidelines';
export type ConstructionAction = 'insert' | 'delete' | 'drag';

const modeOptions = [
  { label: 'Nodes', value: 'nodes', icon: <Share2 className="w-4 h-4 mr-2" /> },
  { label: 'Edges', value: 'edges', icon: <Ruler className="w-4 h-4 mr-2" /> },
  { label: 'Guidelines', value: 'guidelines', icon: <Move className="w-4 h-4 mr-2" /> }
];

const actionOptions = {
  nodes: [
    { label: 'Insert', value: 'insert', icon: <MousePointerClick className="w-4 h-4 mr-2" /> },
    { label: 'Delete', value: 'delete', icon: <Trash className="w-4 h-4 mr-2" /> },
    { label: 'Drag', value: 'drag', icon: <Move className="w-4 h-4 mr-2" /> }
  ],
  edges: [
    { label: 'Insert', value: 'insert', icon: <MousePointerClick className="w-4 h-4 mr-2" /> },
    { label: 'Delete', value: 'delete', icon: <Trash className="w-4 h-4 mr-2" /> }
  ],
  guidelines: [
    { label: 'Insert', value: 'insert', icon: <MousePointerClick className="w-4 h-4 mr-2" /> },
    { label: 'Delete', value: 'delete', icon: <Trash className="w-4 h-4 mr-2" /> },
    { label: 'Drag', value: 'drag', icon: <Move className="w-4 h-4 mr-2" /> }
  ]
};

export function OldToolbar({
  onChange, mode, action
}: {
  onChange: (mode: ConstructionMode, action: ConstructionAction) => void, mode: ConstructionMode, action: ConstructionAction
}) {
  let handleModeChange = (e: { value: ConstructionMode }) => {
    // Reset action if drag becomes invalid
    if (e.value === 'edges' && action === 'drag') {
      onChange(e.value, 'insert');
    } else {
      onChange(e.value, action);
    }
  };

  let handleActionChange = (e: { value: ConstructionAction }) => {
    onChange(mode, e.value);
  };

  let startContents = <Pencil className="w-5 h-5 text-primary" />;
  
  let modeTemplate = (option: any) => (
          <div className="flex items-center">
            {option.icon}
            {option.label}
          </div>
        );
  const modeDropdown = (
    <div className="flex items-center gap-2">
      <span className="font-bold">Mode:</span>
      <Dropdown
        value={mode}
        options={modeOptions}
        onChange={handleModeChange}
        optionLabel="label"
        valueTemplate={modeTemplate}
        itemTemplate={modeTemplate}
      />
    </div>
  );

  let actionTemplate = (option: any) => (
          <div className="flex items-center">
            {option.icon}
            {option.label}
          </div>
        );
  let actionDropdown = (
    <div className="flex items-center gap-2">
      <span className="font-bold">Action:</span>
      <Dropdown
        value={action}
        options={actionOptions[mode]}
        onChange={handleActionChange}
        optionLabel="label"
        valueTemplate={actionTemplate}
        itemTemplate={actionTemplate}
      />
    </div>
  );

  let centerContents = (
    <div className="flex gap-3 items-center">
      {modeDropdown}

      {actionDropdown}
    </div>
  );

  return <Toolbar start={startContents} center={centerContents} />;
}

export type ToolSel = 'insert' | 'delete' | 'drag';

type Tool = {
  name: string;
  icon: React.JSX.Element;
  hotkey: string;
};

// Tool definitions
const tools: Tool[] = [
  { name: 'insert', icon: <Pencil size={18} />, hotkey: 'default' },
  { name: 'delete', icon: <Eraser size={18} />, hotkey: 'Alt' },
  { name: 'drag', icon: <Move size={18} />, hotkey: 'Ctrl' },
];


export function GraphToolbar({ activeTool, onChange }: {activeTool: string, onChange: Function}) {
  let centerContents = (
    <div className="flex gap-2 p-2 rounded shadow">
      {tools.map(tool => (
        <Button
          key={tool.name}
          className={`p-button-rounded p-button-text ${
            activeTool === tool.name ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-white' : ''
          }`}
          onClick={() => onChange(tool.name)}
          tooltip={`${tool.name[0].toUpperCase() + tool.name.slice(1)} (Hotkey: ${tool.hotkey})`}
        >
          {tool.icon}
          </Button>
      ))}
    </div>
  );

  return <Toolbar center={centerContents} />;
}