// Line icons (24px grid, 1.6 stroke) in the style of the Deglaze demo.

type Props = { className?: string };

function Icon({ className = "size-6", children }: Props & { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  );
}

export const HomeIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" />
  </Icon>
);

export const BookIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5z" />
    <path d="M12 6.5v13" />
  </Icon>
);

export const CartIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M3 4h2.5l2.2 10.5h10.6L20.5 7H7" />
    <circle cx="9.5" cy="19" r="1.3" />
    <circle cx="17" cy="19" r="1.3" />
  </Icon>
);

export const GearIcon = (p: Props) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7" />
  </Icon>
);

export const SearchIcon = (p: Props) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.4-4.4" />
  </Icon>
);

export const FilterIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M4 5h16l-6.2 7.6V19l-3.6-1.8v-4.6z" />
  </Icon>
);

export const BackIcon = (p: Props) => (
  <Icon {...p}>
    <path d="m15 5-7 7 7 7" />
  </Icon>
);

export const ShareIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" />
    <path d="M7 11H5.5v9.5h13V11H17" />
  </Icon>
);

export const MenuIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Icon>
);

export const PencilIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M4 20l1-4.5L15.5 5 19 8.5 8.5 19z" />
    <path d="m13.5 7 3.5 3.5" />
  </Icon>
);

export const CameraIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M4 8h3l1.5-2.5h7L17 8h3v11H4z" />
    <circle cx="12" cy="13.2" r="3.4" />
  </Icon>
);

export const KeyboardIcon = (p: Props) => (
  <Icon {...p}>
    <rect x="3" y="6" width="18" height="12" rx="2" />
    <path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10" />
  </Icon>
);

export const LinkIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
    <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
  </Icon>
);

export const PotIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M4 10h16v6a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z" />
    <path d="M2.5 10h19M9 7h6" />
  </Icon>
);

export const PlusIcon = (p: Props) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

// A window with a panel down its left side: "menu at the side".
export const SidebarIcon = (p: Props) => (
  <Icon {...p}>
    <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
    <path d="M9 5v14" />
  </Icon>
);
