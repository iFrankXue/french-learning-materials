import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Translate, {translate} from '@docusaurus/Translate';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  return (
    <header className={styles.heroBanner}>
      <div className="container">
        <p className={styles.eyebrow}>
          <Translate id="homepage.eyebrow">LE FRANÇAIS, PAS À PAS</Translate>
        </p>
        <Heading as="h1" className={styles.heroTitle}>
          <Translate id="homepage.title">把法语学得更清楚</Translate>
        </Heading>
        <p className={styles.heroSubtitle}>
          <Translate id="homepage.subtitle">
            收集、整理并连接实用的法语学习资料，让每一次查找都成为进步的一步。
          </Translate>
        </p>
        <div className={styles.buttons}>
          <Link
            className="button button--primary button--lg"
            to="/docs/intro">
            <Translate id="homepage.cta">开始浏览资料</Translate>
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  return (
    <Layout
      title={translate({id: 'homepage.metaTitle', message: '首页'})}
      description={translate({
        id: 'homepage.metaDescription',
        message: '结构清晰、持续更新的法语学习资料库。',
      })}>
      <HomepageHeader />
      <main className={styles.main}>
        <section className={`container ${styles.section}`}>
          <div className={styles.sectionHeading}>
            <span className={styles.sectionIndex}>01</span>
            <Heading as="h2">
              <Translate id="homepage.exploreTitle">从这里开始探索</Translate>
            </Heading>
          </div>
          <div className={styles.cardGrid}>
            <article className={styles.card}>
              <span className={styles.cardLabel}>A1—A2</span>
              <Heading as="h3">
                <Translate id="homepage.card.foundation.title">基础入门</Translate>
              </Heading>
              <p>
                <Translate id="homepage.card.foundation.body">
                  从发音、词汇和基础语法开始，建立可靠的语言根基。
                </Translate>
              </p>
            </article>
            <article className={styles.card}>
              <span className={styles.cardLabel}>B1—B2</span>
              <Heading as="h3">
                <Translate id="homepage.card.skills.title">专项提升</Translate>
              </Heading>
              <p>
                <Translate id="homepage.card.skills.body">
                  按听、说、读、写整理练习方法与精选资源。
                </Translate>
              </p>
            </article>
            <article className={styles.card}>
              <span className={styles.cardLabel}>OUTILS</span>
              <Heading as="h3">
                <Translate id="homepage.card.tools.title">学习工具</Translate>
              </Heading>
              <p>
                <Translate id="homepage.card.tools.body">
                  集中查找词典、语料、课程与日常学习工具。
                </Translate>
              </p>
            </article>
          </div>
        </section>
      </main>
    </Layout>
  );
}
