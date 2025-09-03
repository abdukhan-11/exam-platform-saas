"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface SelectProps {
  value?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
  children: React.ReactNode
}

interface SelectTriggerProps {
  children: React.ReactNode
  className?: string
  disabled?: boolean
  onClick?: () => void
}

interface SelectContentProps {
  children: React.ReactNode
  className?: string
  isOpen?: boolean
}

interface SelectItemProps {
  value: string
  children: React.ReactNode
  onClick?: () => void
  className?: string
}

interface SelectValueProps {
  placeholder?: string
  children?: React.ReactNode
}

const SelectContext = React.createContext<{
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  value?: string
  onValueChange?: (value: string) => void
}>({
  isOpen: false,
  setIsOpen: () => {},
})

const Select = React.forwardRef<HTMLDivElement, SelectProps>(
  ({ value, onValueChange, disabled, children }, ref) => {
    const [isOpen, setIsOpen] = React.useState(false)

    return (
      <SelectContext.Provider value={{ isOpen, setIsOpen, value, onValueChange }}>
        <div ref={ref} className="relative">
          {children}
        </div>
      </SelectContext.Provider>
    )
  }
)
Select.displayName = "Select"

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ children, className, disabled, onClick, ...props }, ref) => {
    const { isOpen, setIsOpen } = React.useContext(SelectContext)

    const handleClick = () => {
      if (onClick) {
        onClick()
      } else {
        setIsOpen(!isOpen)
      }
    }

    return (
      <button
        ref={ref}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        disabled={disabled}
        onClick={handleClick}
        {...props}
      >
        {children}
        <ChevronDown className={cn("h-4 w-4 opacity-50 transition-transform", isOpen && "rotate-180")} />
      </button>
    )
  }
)
SelectTrigger.displayName = "SelectTrigger"

const SelectContent = React.forwardRef<HTMLDivElement, SelectContentProps>(
  ({ children, className, isOpen: controlledIsOpen, ...props }, ref) => {
    const { isOpen, setIsOpen } = React.useContext(SelectContext)
    const shouldShow = controlledIsOpen !== undefined ? controlledIsOpen : isOpen

    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (ref && 'current' in ref && ref.current && !ref.current.contains(event.target as Node)) {
          setIsOpen(false)
        }
      }

      if (shouldShow) {
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
      }
    }, [shouldShow, setIsOpen, ref])

    if (!shouldShow) return null

    return (
      <div
        ref={ref}
        className={cn(
          "absolute top-full left-0 right-0 z-50 mt-1 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
SelectContent.displayName = "SelectContent"

const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ value, children, onClick, className, ...props }, ref) => {
    const { setIsOpen, onValueChange } = React.useContext(SelectContext)

    const handleClick = () => {
      if (onValueChange) {
        onValueChange(value)
      }
      if (onClick) {
        onClick()
      }
      setIsOpen(false)
    }

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
          className
        )}
        onClick={handleClick}
        {...props}
      >
        {children}
      </div>
    )
  }
)
SelectItem.displayName = "SelectItem"

const SelectValue = React.forwardRef<HTMLSpanElement, SelectValueProps>(
  ({ placeholder, children, ...props }, ref) => {
    const { value } = React.useContext(SelectContext)
    
    return (
      <span
        ref={ref}
        className="block truncate"
        {...props}
      >
        {children || value || placeholder}
      </span>
    )
  }
)
SelectValue.displayName = "SelectValue"

export {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
}
