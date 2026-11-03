import { Header } from "./Header";
import { Footer } from "./Footer";
import { ChatBot } from "@/components/Soporte";
import styles from "./Layout.module.scss";

export function Layout({ children }) {
  return (
    <div className={styles.shell}>
      <Header />
      <main className={styles.main}>{children}</main>
      <Footer />
      <ChatBot />
    </div>
  );
}
