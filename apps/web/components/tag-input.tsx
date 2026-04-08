"use client"

import { useState, useEffect, useRef } from "react"
import { Badge } from "@workspace/ui/components/badge"
import { Input } from "@workspace/ui/components/input"
import { X, Search } from "lucide-react"

interface Tag {
  id: string
  name: string
}

interface TagInputProps {
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
}

export function TagInput({ value, onChange, placeholder = "Add tag..." }: TagInputProps) {
  const [input, setInput] = useState("")
  const [suggestions, setSuggestions] = useState<Tag[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (input.trim()) {
      fetch(`/api/tags?q=${input}`)
        .then(res => res.json())
        .then(data => setSuggestions(data))
    } else {
      setSuggestions([])
    }
  }, [input])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const addTag = (tag: string) => {
    const trimmed = tag.trim()
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed])
    }
    setInput("")
    setShowSuggestions(false)
  }

  const removeTag = (tag: string) => {
    onChange(value.filter(t => t !== tag))
  }

  return (
    <div className="space-y-2" ref={containerRef}>
      <div className="flex flex-wrap gap-2 p-2 min-h-12 border rounded-md bg-background focus-within:ring-2 focus-within:ring-primary/20 transition-all">
        {value.map(tag => (
          <Badge key={tag} variant="secondary" className="flex items-center gap-1 pl-2.5 pr-1 py-1 group">
            {tag}
            <button
              onClick={() => removeTag(tag)}
              className="hover:bg-muted-foreground/20 rounded-full p-0.5 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
        <div className="relative flex-1 min-w-[120px]">
          <Input
            value={input}
            onChange={e => {
              setInput(e.target.value)
              setShowSuggestions(true)
            }}
            onKeyDown={e => {
              if (e.key === "Enter") {
                e.preventDefault()
                addTag(input)
              }
            }}
            className="border-0 focus-visible:ring-0 h-8 px-1"
            placeholder={value.length === 0 ? placeholder : ""}
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 w-full mt-1 bg-popover text-popover-foreground border rounded-md shadow-lg z-50 overflow-hidden">
              {suggestions.map(s => (
                <button
                  key={s.id}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-2"
                  onClick={() => addTag(s.name)}
                >
                  <Search className="w-3.5 h-3.5 opacity-50" />
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground px-1">Press Enter to add multiple tags</p>
    </div>
  )
}
