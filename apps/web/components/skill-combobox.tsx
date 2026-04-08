"use client"

import { useState, useRef, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { X, Plus, ChevronsUpDown, Loader2 } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"

interface Skill {
  id: string
  name: string
}

interface SkillComboboxProps {
  /** Currently selected skill names */
  value: string[]
  onChange: (names: string[]) => void
}

async function fetchSkills(): Promise<Skill[]> {
  const res = await fetch("/api/skills")
  if (!res.ok) throw new Error("Failed to fetch skills")
  return res.json()
}

async function createSkill(name: string): Promise<Skill> {
  const res = await fetch("/api/skills", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) throw new Error("Failed to create skill")
  return res.json()
}

export function SkillCombobox({ value, onChange }: SkillComboboxProps) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { data: allSkills = [], isLoading } = useQuery<Skill[]>({
    queryKey: ["skills"],
    queryFn: fetchSkills,
    staleTime: 1000 * 60 * 5, // 5 min
  })

  const { mutate: addSkill, isPending: isCreating } = useMutation({
    mutationFn: createSkill,
    onSuccess: (skill) => {
      queryClient.invalidateQueries({ queryKey: ["skills"] })
      if (!value.includes(skill.name)) {
        onChange([...value, skill.name])
      }
      setInputValue("")
      setOpen(false)
    },
  })

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const filtered = allSkills.filter(
    (s) =>
      s.name.toLowerCase().includes(inputValue.toLowerCase()) &&
      !value.includes(s.name)
  )

  const exactMatch = allSkills.some(
    (s) => s.name.toLowerCase() === inputValue.trim().toLowerCase()
  )

  const handleSelect = (name: string) => {
    if (!value.includes(name)) {
      onChange([...value, name])
    }
    setInputValue("")
    setOpen(false)
    inputRef.current?.focus()
  }

  const handleRemove = (name: string) => {
    onChange(value.filter((v) => v !== name))
  }

  const handleCreate = () => {
    const trimmed = inputValue.trim()
    if (!trimmed) return
    // If exact match exists but not selected, just select it
    const existing = allSkills.find(
      (s) => s.name.toLowerCase() === trimmed.toLowerCase()
    )
    if (existing) {
      handleSelect(existing.name)
    } else {
      addSkill(trimmed)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      if (filtered.length === 1) {
        handleSelect(filtered[0]!.name)
      } else if (inputValue.trim() && !exactMatch) {
        handleCreate()
      } else if (filtered.length > 0) {
        handleSelect(filtered[0]!.name)
      }
    }
    if (e.key === "Escape") {
      setOpen(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Selected skill badges */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((name) => (
            <span
              key={name}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-primary/10 border border-primary/20 text-primary font-medium"
            >
              {name}
              <button
                type="button"
                onClick={() => handleRemove(name)}
                className="text-primary/60 hover:text-destructive transition-colors"
                aria-label={`Remove ${name}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Combobox input */}
      <div className="relative" ref={dropdownRef}>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value)
                setOpen(true)
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder="Search or add a skill…"
              className="pr-8"
            />
            <ChevronsUpDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>
          {inputValue.trim() && !exactMatch && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCreate}
              disabled={isCreating}
              className="gap-1.5 shrink-0"
            >
              {isCreating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              Add
            </Button>
          )}
        </div>

        {/* Dropdown */}
        {open && (
          <div className="absolute z-50 top-full mt-1 w-full rounded-md border border-border bg-popover shadow-md overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-4 text-muted-foreground text-sm gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading skills…
              </div>
            ) : filtered.length === 0 && !inputValue.trim() ? (
              <p className="text-center text-sm text-muted-foreground py-4">
                All available skills selected.
              </p>
            ) : filtered.length === 0 && inputValue.trim() ? (
              <div className="px-3 py-3 text-sm">
                <p className="text-muted-foreground mb-2">No skill found.</p>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={isCreating}
                  className="flex items-center gap-1.5 text-primary hover:underline text-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create &quot;{inputValue.trim()}&quot;
                </button>
              </div>
            ) : (
              <ul className="max-h-48 overflow-y-auto py-1">
                {filtered.map((skill) => (
                  <li key={skill.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(skill.name)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      {skill.name}
                    </button>
                  </li>
                ))}
                {inputValue.trim() && !exactMatch && (
                  <li className="border-t border-border mt-1 pt-1">
                    <button
                      type="button"
                      onClick={handleCreate}
                      disabled={isCreating}
                      className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-accent flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Create &quot;{inputValue.trim()}&quot;
                    </button>
                  </li>
                )}
              </ul>
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Type to search existing skills or create a new one. Press{" "}
        <kbd className="px-1 py-0.5 rounded border border-border bg-muted text-xs">Enter</kbd>{" "}
        to select.
      </p>
    </div>
  )
}
