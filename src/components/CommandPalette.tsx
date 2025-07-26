import React, { useState, useEffect } from 'react';
import {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut
} from "@/components/ui/command";
import { useNavigate } from 'react-router-dom';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onOpenChange }) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const routes = [
    {
      label: "Dashboard",
      path: "/",
      shortcut: "D"
    },
    {
      label: "SMS Scan",
      path: "/expenses",
      shortcut: "E"
    },
    {
      label: "Settings",
      path: "/settings",
      shortcut: "S"
    },
  ];

  const handleSelect = (path: string) => {
    navigate(path);
    onOpenChange(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <Command>
        <CommandInput
          placeholder="Type a command or search..."
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigation">
            {routes.map((route) => (
              <CommandItem
                key={route.path}
                onSelect={() => handleSelect(route.path)}
              >
                {route.label}
                {route.shortcut && (
                  <CommandShortcut>{route.shortcut}</CommandShortcut>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
};

export default CommandPalette;
