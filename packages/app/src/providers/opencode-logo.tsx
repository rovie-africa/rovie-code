export function OpenCodeLogo(props: { class?: string }) {
  return (
    <svg class={props.class} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="36" rx="4" fill="var(--v2-background-bg-base)" />
      <path d="M22.5 16.5H13.5V12H22.5V16.5Z" fill="var(--icon-weak-base)" />
      <path
        d="M22.5 12H13.5V16.5H22.5V12ZM27 18.75H22.5V27H18V20.25H13.5V27H9V9H27V18.75Z"
        fill="var(--icon-strong-base)"
      />
    </svg>
  )
}
