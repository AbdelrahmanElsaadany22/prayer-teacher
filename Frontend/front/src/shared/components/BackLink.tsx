import { Link } from 'react-router-dom';
import css from './BackLink.module.css';

type Props = {
  to: string;
  label: string;
  className?: string;
};

/**
 * A "go back" link: a chevron plus its label.
 *
 * The chevron is an SVG flipped by CSS on RTL rather than a "←"/"→" character
 * chosen in JS. Arrow characters are bidi-neutral, so which way they end up
 * facing next to Arabic text depends on the surrounding run — which is how the
 * old ones drifted out of step with the layout. An SVG has no such behaviour,
 * and keeping the arrow out of the translated string means a translator can't
 * leave one pointing the wrong way either.
 */
export default function BackLink({ to, label, className }: Props) {
  return (
    <Link to={to} className={`${css.back}${className ? ` ${className}` : ''}`}>
      <svg
        className={css.chevron}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M15 5l-7 7 7 7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>{label}</span>
    </Link>
  );
}
