type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' };

export default function Button({ variant = 'primary', className = '', children, ...rest }: Props) {
  return (
    <button {...rest} className={`btn btn-${variant} ${className}`}>
      {children}
    </button>
  );
}
