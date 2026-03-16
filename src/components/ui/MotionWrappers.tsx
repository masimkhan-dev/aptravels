import { motion, type MotionProps } from "framer-motion";
import type { ReactNode } from "react";

interface WrapperProps extends MotionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
}

/** Fades in with a gentle upward slide — for section content */
export function FadeUp({ children, className = "", delay = 0, duration = 0.6, ...rest }: WrapperProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** Scales in from slightly smaller — for cards, badges, illustrations */
export function ScaleIn({ children, className = "", delay = 0, duration = 0.5, ...rest }: WrapperProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration, delay, ease: [0.34, 1.56, 0.64, 1] }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** Slides in from left — for LHS layout columns */
export function SlideInLeft({ children, className = "", delay = 0, duration = 0.65, ...rest }: WrapperProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** Slides in from right — for RHS layout columns */
export function SlideInRight({ children, className = "", delay = 0, duration = 0.65, ...rest }: WrapperProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** Wraps a list of StaggerItem children with staggered animation */
export function StaggerContainer({ children, className = "", delay = 0, staggerChildren = 0.1, ...rest }: WrapperProps & { staggerChildren?: number }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      transition={{ delayChildren: delay, staggerChildren }}
      variants={{ hidden: {}, visible: {} }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** Individual item inside StaggerContainer */
export function StaggerItem({ children, className = "", ...rest }: Omit<WrapperProps, "delay" | "duration">) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
      }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
