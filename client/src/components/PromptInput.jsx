import { useEffect, useRef, useState } from "react";
import { ArrowRightIcon, Loader2Icon } from "lucide-react";

const PromptInput = ({
  onSubmit,
  loading = false,
  placeholder = "Describe the website you want to build...",
  large = false,
  autoFocus = false,
  variant = "default",
}) => {
  const [value, setValue] = useState("");
  const textareaRef = useRef(null);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();

    const trimmed = value.trim();

    if (!trimmed || loading) return;

    onSubmit(trimmed);
    setValue("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (variant === "glass") {
    return (
      <form
        onSubmit={handleSubmit}
        className='max-w-2xl w-full bg-white/10 backdrop-blur-xl rounded-xl ring-1 ring-white/25 focus-within:ring-2 focus-within:ring-white/30 overflow-hidden mt-6 transition'
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={loading}
          rows={3}
          className='w-full p-4 pb-2 resize-none placeholder:text-white/60 outline-none bg-transparent text-white text-base'
        />

        <div className='flex items-center justify-end pb-3 px-3'>
          <button
            type='submit'
            disabled={!value.trim() || loading}
            className='flex items-center justify-center p-1.5 rounded-full bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 cursor-pointer transition'
          >
            {loading ? (
              <Loader2Icon size={18} className='animate-spin' />
            ) : (
              <ArrowRightIcon size={18} />
            )}
          </button>
        </div>
      </form>
    );
  }
};

export default PromptInput;
