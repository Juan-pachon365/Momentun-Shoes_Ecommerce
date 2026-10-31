import { Header } from "./Header";
import { Footer } from "./Footer";
import styles from "./Layout.module.scss";

export function Layout({ children }) {
  return (
    <div className={styles.shell}>
      <Header />
      <main className={styles.main}>{children}</main>
      <Footer />
    </div>
  );
}
