/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
	extend: {
		borderRadius: {
			lg: 'var(--radius)',
			md: 'calc(var(--radius) - 2px)',
			sm: 'calc(var(--radius) - 4px)'
		},
		colors: {
			background: 'hsl(var(--background))',
			foreground: 'hsl(var(--foreground))',
			card: {
				DEFAULT: 'hsl(var(--card))',
				foreground: 'hsl(var(--card-foreground))'
			},
			popover: {
				DEFAULT: 'hsl(var(--popover))',
				foreground: 'hsl(var(--popover-foreground))'
			},
			primary: {
				DEFAULT: 'hsl(var(--primary))',
				foreground: 'hsl(var(--primary-foreground))'
			},
			secondary: {
				DEFAULT: 'hsl(var(--secondary))',
				foreground: 'hsl(var(--secondary-foreground))'
			},
			muted: {
				DEFAULT: 'hsl(var(--muted))',
				foreground: 'hsl(var(--muted-foreground))'
			},
			accent: {
				DEFAULT: 'hsl(var(--accent))',
				foreground: 'hsl(var(--accent-foreground))'
			},
			destructive: {
				DEFAULT: 'hsl(var(--destructive))',
				foreground: 'hsl(var(--destructive-foreground))'
			},
			border: 'hsl(var(--border))',
			input: 'hsl(var(--input))',
			ring: 'hsl(var(--ring))',
			bm: {
				primary: 'var(--bm-primary)',
				'primary-hover': 'var(--bm-primary-hover)',
				success: 'var(--bm-success)',
				error: 'var(--bm-error)',
				warning: 'var(--bm-warning)',
				info: 'var(--bm-info)',
				app: 'var(--bm-bg-app)',
				sidebar: 'var(--bm-bg-sidebar)',
				card: 'var(--bm-bg-card)',
				elevated: 'var(--bm-bg-elevated)',
				input: 'var(--bm-bg-input)',
				modal: 'var(--bm-bg-modal)',
				border: 'var(--bm-border)',
				'border-strong': 'var(--bm-border-strong)',
				'text-primary': 'var(--bm-text-primary)',
				'text-secondary': 'var(--bm-text-secondary)',
				'text-muted': 'var(--bm-text-muted)',
				hover: 'var(--bm-hover-bg)',
				active: 'var(--bm-active-bg)',
				disabled: 'var(--bm-disabled-bg)'
			},
			chart: {
				'1': 'hsl(var(--chart-1))',
				'2': 'hsl(var(--chart-2))',
				'3': 'hsl(var(--chart-3))',
				'4': 'hsl(var(--chart-4))',
				'5': 'hsl(var(--chart-5))'
			}
		},
		keyframes: {
			'accordion-down': {
				from: {
					height: '0'
				},
				to: {
					height: 'var(--radix-accordion-content-height)'
				}
			},
			'accordion-up': {
				from: {
					height: 'var(--radix-accordion-content-height)'
				},
				to: {
					height: '0'
				}
			}
		},
		animation: {
			'accordion-down': 'accordion-down var(--bm-motion-duration-panel) var(--bm-motion-ease)',
			'accordion-up': 'accordion-up var(--bm-motion-duration-panel) var(--bm-motion-ease)'
		}
	}
  },
  plugins: [require("tailwindcss-animate")],
};
