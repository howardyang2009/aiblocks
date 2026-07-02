type Props = {
  user: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
};

export function UserAvatar({ user }: Props) {
  return user.avatar_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={user.avatar_url} alt="" className="w-7 h-7 rounded-block object-cover shrink-0" />
  ) : (
    <span className="w-7 h-7 rounded-block border bg-surface inline-flex items-center justify-center font-mono text-[11px] text-subtle shrink-0">
      {(user.display_name ?? user.username).slice(0, 1).toUpperCase()}
    </span>
  );
}
