import * as React from "react"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { }

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-xl text-base font-semibold ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-70 ${className}`}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button }
