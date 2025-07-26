import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
				sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
				mono: ['SF Mono', 'monospace'],
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				// Category-specific colors with improved contrast
				category: {
					groceries: '#38A169',
					utilities: '#3182CE',
					entertainment: '#805AD5',  
					transportation: '#DD6B20',
					dining: '#E53E3E',
					shopping: '#4C51BF',
					health: '#D53F8C',
					travel: '#00B5D8',
					housing: '#2F855A',
					education: '#DD6B20',
					subscriptions: '#6B46C1',
					other: '#718096'
				},
				blue: {
                    '50': '#eff6ff',
                    '100': '#dbeafe',
                    '200': '#bfdbfe',
                    '300': '#93c5fd',
                    '400': '#60a5fa',
                    '500': '#3b82f6',
                    '600': '#2563eb',
                    '700': '#1d4ed8',
                    '800': '#1e40af',
                    '900': '#1e3a8a',
                    '950': '#172554',
                },
			},
			borderRadius: {
				// Rounder corners for modern design
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
				xl: '1rem',
				'2xl': '1.5rem',
				'3xl': '2rem',
				'full': '9999px',
			},
			scale: {
				'98': '0.98',  // Add custom scale value for active:scale-98
				'102': '1.02',  // Add custom scale value for hover:scale-102
			},
			keyframes: {
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' }
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' }
				},
				fadeIn: {
					from: { opacity: '0' },
					to: { opacity: '1' }
				},
				fadeInUp: {
					from: { opacity: '0', transform: 'translateY(10px)' },
					to: { opacity: '1', transform: 'translateY(0)' }
				},
				fadeInDown: {
					from: { opacity: '0', transform: 'translateY(-10px)' },
					to: { opacity: '1', transform: 'translateY(0)' }
				},
				slideIn: {
					from: { transform: 'translateX(100%)' },
					to: { transform: 'translateX(0)' }
				},
				pulse: {
					'0%, 100%': { opacity: '1' },
					'50%': { opacity: '0.5' }
				},
				float: {
					'0%, 100%': { transform: 'translateY(0)' },
					'50%': { transform: 'translateY(-5px)' }
				},
				shimmer: {
					'0%': { backgroundPosition: '-200% 0' },
					'100%': { backgroundPosition: '200% 0' }
				},
				slideInFromBottom: {
					from: { transform: 'translateY(20px)', opacity: '0' },
					to: { transform: 'translateY(0)', opacity: '1' }
				},
				expandWidth: {
					from: { width: '0%' },
					to: { width: '100%' }
				},
				spin: {
					from: { transform: 'rotate(0deg)' },
					to: { transform: 'rotate(360deg)' }
				},
				ripple: {
					'0%': { transform: 'scale(0)', opacity: '0.8' },
					'100%': { transform: 'scale(4)', opacity: '0' }
				},
				// New animations
				fadeInScale: {
					'0%': { opacity: '0', transform: 'scale(0.95)' },
					'100%': { opacity: '1', transform: 'scale(1)' }
				},
				fadeOutScale: {
					'0%': { opacity: '1', transform: 'scale(1)' },
					'100%': { opacity: '0', transform: 'scale(0.95)' }
				},
				bounce: {
					'0%, 100%': { transform: 'translateY(0)' },
					'50%': { transform: 'translateY(-5px)' }
				},
				slideRight: {
					'0%': { transform: 'translateX(-10px)', opacity: '0' },
					'100%': { transform: 'translateX(0)', opacity: '1' }
				},
				slideLeft: {
					'0%': { transform: 'translateX(10px)', opacity: '0' },
					'100%': { transform: 'translateX(0)', opacity: '1' }
				},
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fadeIn 0.4s ease-out',
				'fade-in-up': 'fadeInUp 0.4s ease-out',
				'fade-in-down': 'fadeInDown 0.4s ease-out',
				'slide-in': 'slideIn 0.3s ease-out',
				'pulse-slow': 'pulse 3s infinite',
				'float': 'float 3s ease-in-out infinite',
				'shimmer': 'shimmer 2s infinite linear',
				'slide-in-from-bottom': 'slideInFromBottom 0.4s ease-out',
				'expand-width': 'expandWidth 0.4s ease-out',
				'spin-slow': 'spin 3s linear infinite',
				'ripple': 'ripple 0.8s ease-out',
				// New animation classes
				'fade-in-scale': 'fadeInScale 0.3s ease-out',
				'fade-out-scale': 'fadeOutScale 0.3s ease-out',
				'bounce-slow': 'bounce 2s ease-in-out infinite',
				'slide-right': 'slideRight 0.3s ease-out',
				'slide-left': 'slideLeft 0.3s ease-out',
			},
			boxShadow: {
				'subtle': '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
				'elevated': '0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)',
				'higher': '0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23)',
				'inner-subtle': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
				'card': '0 4px 12px rgba(0, 0, 0, 0.08)',
				'card-hover': '0 8px 24px rgba(0, 0, 0, 0.12)',
				'button': '0 2px 8px -1px rgba(0, 0, 0, 0.12)',
				'premium': '0 10px 30px -5px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.05)',
				'premium-hover': '0 12px 40px -8px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.1)',
				'floating': '0 8px 16px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.08)',
			},
			backdropBlur: {
				'2xs': '2px',
				'xs': '4px',
				'2xl': '40px',
			}
		}
	},
	plugins: [
		require("tailwindcss-animate"),
		// Add a plugin to ensure active variants are available for transform utilities like scale
		plugin(({ addVariant }) => {
			addVariant('active', '&:active');
		}),
		// Add plugin for safe area insets
		plugin(({ addUtilities }) => {
			addUtilities({
				'.pt-safe': { 'padding-top': 'env(safe-area-inset-top)' },
				'.pr-safe': { 'padding-right': 'env(safe-area-inset-right)' },
				'.pb-safe': { 'padding-bottom': 'env(safe-area-inset-bottom)' },
				'.pl-safe': { 'padding-left': 'env(safe-area-inset-left)' },
			});
		})
	],
} satisfies Config;
