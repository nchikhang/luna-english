import { Pressable, Text, ActivityIndicator, type PressableProps } from 'react-native';

interface ButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

/**
 * Reusable button với variant + size + loading state.
 *
 * Cách dùng:
 *   <Button label="Lưu" onPress={handleSave} />
 *   <Button label="Xóa" variant="danger" size="sm" onPress={handleDelete} />
 */
export function Button({
  label,
  variant = 'primary',
  size = 'md',
  isLoading,
  disabled,
  className,
  ...props
}: ButtonProps) {
  const variantClasses = {
    primary: 'bg-primary-600 active:bg-primary-700',
    secondary: 'bg-gray-200 active:bg-gray-300',
    danger: 'bg-red-600 active:bg-red-700',
  }[variant];

  const sizeClasses = {
    sm: 'px-3 py-2',
    md: 'px-5 py-3',
    lg: 'px-8 py-4',
  }[size];

  const textColor = variant === 'secondary' ? 'text-gray-900' : 'text-white';
  const textSize = { sm: 'text-sm', md: 'text-base', lg: 'text-lg' }[size];

  const isDisabled = disabled || isLoading;

  return (
    <Pressable
      disabled={isDisabled}
      className={[
        'rounded-full items-center justify-center flex-row',
        variantClasses,
        sizeClasses,
        isDisabled ? 'opacity-50' : '',
        className ?? '',
      ].join(' ')}
      {...props}
    >
      {isLoading && (
        <ActivityIndicator
          size="small"
          color={variant === 'secondary' ? '#1f2937' : '#fff'}
          className="mr-2"
        />
      )}
      <Text className={`font-semibold ${textColor} ${textSize}`}>{label}</Text>
    </Pressable>
  );
}