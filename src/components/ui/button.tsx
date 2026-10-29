import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20E34A] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none active:scale-[0.98]',
  {
    variants: {
      variant: {
        default:
          'bg-[#082F1B] text-white hover:bg-[#12452C] shadow-sm',
        primary:
          'bg-[#20E34A] text-[#06351F] font-semibold hover:bg-[#1BC640] shadow-sm hover:shadow',
        outline:
          'border border-[#E5E9E6] bg-white text-[#18251D] hover:bg-[#F7F8F8] hover:border-[#CBD3CE]',
        secondary:
          'bg-[#F0F1F3] text-[#18251D] hover:bg-[#E5E9E6]',
        ghost:
          'text-[#5E6962] hover:text-[#18251D] hover:bg-[#F0F1F3]',
        forest:
          'bg-[#06351F] text-[#D2DFD7] hover:bg-[#12452C] hover:text-white border border-[#14482E]',
        danger:
          'bg-red-600 text-white hover:bg-red-700 shadow-sm',
      },
      size: {
        default: 'h-9 px-4 py-2 rounded-xl',
        sm: 'h-8 px-3 rounded-lg text-xs',
        lg: 'h-11 px-6 rounded-xl text-base',
        icon: 'h-9 w-9 rounded-xl',
        iconSm: 'h-7 w-7 rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<any>, {
        className: cn(buttonVariants({ variant, size, className }), (children.props as any)?.className),
        ...props,
      });
    }

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

