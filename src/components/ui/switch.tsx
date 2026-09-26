import { Switch as SwitchPrimitive } from "@base-ui/react/switch"
import { cn } from "cn"

function Switch({
  className,
  size = "default",
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: "sm" | "default"
}) {
  const sm = size === "sm"

  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer relative inline-flex shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors outline-none",
        "focus-visible:ring-3 focus-visible:ring-ring/50",
        "data-unchecked:bg-[#3a3a3a] data-checked:bg-[#4caf7d]",
        "data-disabled:cursor-not-allowed data-disabled:opacity-50",
        sm ? "h-5 w-9" : "h-6 w-11",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block rounded-full bg-white shadow-sm ring-0 transition-transform duration-200",
          sm
            ? "size-4 data-unchecked:translate-x-0 data-checked:translate-x-4"
            : "size-5 data-unchecked:translate-x-0 data-checked:translate-x-5",
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
