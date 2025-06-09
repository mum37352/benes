import { Dropdown } from "primereact/dropdown";
import { Toolbar } from "primereact/toolbar";
import { useState } from "react";
import { Pencil, MousePointerClick, Trash, Move, Share2, Ruler } from 'lucide-react';

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

export default function GraphToolbar({
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