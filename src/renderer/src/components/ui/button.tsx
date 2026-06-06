import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@renderer/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-150 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]',
  {
    variants: {
      variant: {
        default:
          'bg-linear-to-br from-violet-600 to-purple-700 text-white shadow-sm shadow-violet-200 hover:from-violet-500 hover:to-purple-600 hover:shadow-md hover:shadow-violet-200',
        destructive:
          'bg-linear-to-br from-red-500 to-rose-600 text-white shadow-sm hover:from-red-400 hover:to-rose-500 hover:shadow-md',
        outline:
          'border border-violet-200 bg-white text-violet-700 hover:bg-violet-50 hover:border-violet-300',
        secondary:
          'bg-violet-100 text-violet-800 hover:bg-violet-200',
        ghost:
          'text-violet-700 hover:bg-violet-50',
        link:
          'text-violet-600 underline-offset-4 hover:underline'
      },
      size: {
        default: 'h-10 px-5 py-2',
        sm: 'h-8 rounded-lg px-3 text-xs',
        lg: 'h-12 rounded-xl px-8 text-base',
        icon: 'h-10 w-10'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
