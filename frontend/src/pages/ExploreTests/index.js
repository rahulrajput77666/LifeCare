import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import styles from "./styles.module.css";

function ExploreTests() {
  // data
  const [profiles, setProfiles] = useState([]);
  const [individualTests, setIndividualTests] = useState([]);

  // ui
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState("profiles");
  const [showAllProfiles, setShowAllProfiles] = useState(false);
  const [profileExpandedTests, setProfileExpandedTests] = useState({});
  const [showAllTests, setShowAllTests] = useState(false);
  const [expandedTestId, setExpandedTestId] = useState(null); // NEW for individual test details

  // constants
  const VISIBLE_PROFILE_COUNT = 4;
  const VISIBLE_TEST_COUNT = 6;
  const VISIBLE_TESTS_IN_PROFILE = 4;

  useEffect(() => {
    let cancelled = false;
    async function fetchAll() {
      try {
        setLoading(true);
        const [profilesRes, testsRes] = await Promise.all([
          axios.get("http://localhost:5000/api/profiles/"),
          axios.get("http://localhost:5000/api/tests/"),
        ]);
        if (cancelled) return;
        setProfiles(profilesRes.data || []);
        setIndividualTests(testsRes.data || []);
        setError("");
      } catch (err) {
        console.error("Failed to fetch:", err);
        if (!cancelled) setError("Could not load test information. Please try again later.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchAll();
    return () => { cancelled = true; };
  }, []);

  // resolve a test entry
  const resolveTest = (t) => {
    if (!t) return null;
    if (typeof t === "object") return t;
    return individualTests.find(it => it._id === t) || { _id: t, name: "Unknown test", price: 0 };
  };

  const calculateOriginalTotal = (profile) => {
    if (!profile?.tests || profile.tests.length === 0) return 0;
    return Math.round(profile.tests.reduce((sum, t) => {
      const testObj = resolveTest(t);
      const p = Number(testObj?.price || 0);
      return sum + (Number.isFinite(p) ? p : 0);
    }, 0));
  };

  const calculateSavings = (profile) => {
    const original = calculateOriginalTotal(profile);
    const discounted = Number(profile.price || 0);
    const diff = original - discounted;
    return diff > 0 ? Math.round(diff) : 0;
  };

  const visibleProfiles = useMemo(() => {
    return showAllProfiles ? profiles : profiles.slice(0, VISIBLE_PROFILE_COUNT);
  }, [profiles, showAllProfiles]);

  const visibleTests = useMemo(() => {
    return showAllTests ? individualTests : individualTests.slice(0, VISIBLE_TEST_COUNT);
  }, [individualTests, showAllTests]);

  if (loading) return <p className={styles.pageMessage}>Loading tests...</p>;
  if (error) return <p className={`${styles.pageMessage} ${styles.errorMessage}`}>{error}</p>;

  return (
    <main className={styles.pageContainer}>
      <header className={styles.header} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Explore Our Tests</h1>
          <p>Choose from curated health profiles or pick individual tests.</p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className={activeSection === 'profiles' ? styles.formButton : styles.cancelButton}
            onClick={() => setActiveSection('profiles')}
            aria-pressed={activeSection === 'profiles'}
          >
            Explore Test Profiles
          </button>

          <button
            className={activeSection === 'tests' ? styles.formButton : styles.cancelButton}
            onClick={() => setActiveSection('tests')}
            aria-pressed={activeSection === 'tests'}
          >
            Explore Individual Tests
          </button>
        </div>
      </header>

      {/* Profiles Section */}
      {activeSection === 'profiles' && (
        <section className={styles.section} style={{ marginTop: 18 }}>
          <h2 className={styles.sectionTitle}>Health Profiles</h2>

          <div className={styles.profileGrid}>
            {visibleProfiles.length === 0 && <p className={styles.pageMessage}>No profiles available.</p>}

            {visibleProfiles.map(profile => {
              const originalTotal = calculateOriginalTotal(profile);
              const savings = calculateSavings(profile);
              const testsInProfile = (profile.tests || []).map(resolveTest);
              const expanded = !!profileExpandedTests[profile._id];
              const visibleTestsForProfile = expanded ? testsInProfile : testsInProfile.slice(0, VISIBLE_TESTS_IN_PROFILE);

              return (
                <div key={profile._id} className={styles.profileCard}>
                  <div className={styles.cardHeader} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <h3 style={{ margin: 0 }}>{profile.name}</h3>
                    <p style={{ margin: 0, fontWeight: 700 }}>Rs. {profile.price}</p>
                  </div>

                  <div className={styles.cardBody}>
                    <p style={{ marginBottom: 12, color: '#6c757d' }}>{profile.description}</p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                      <div>
                        <div style={{ color: '#555' }}>Total tests price</div>
                        <div style={{ fontWeight: 700 }}>Rs. {originalTotal}</div>
                      </div>

                      <div>
                        <div style={{ color: '#555' }}>You save</div>
                        <div style={{ fontWeight: 700, color: savings > 0 ? '#1b7a2f' : '#6c757d' }}>Rs. {savings}</div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: '#555' }}>Total tests</div>
                        <div style={{ fontWeight: 700 }}>{testsInProfile.length}</div>
                      </div>
                    </div>

                    <h4 className={styles.includesTitle} style={{ marginTop: 14 }}>Tests included</h4>
                    <ul className={styles.testList}>
                      {visibleTestsForProfile.map(tst => (
                        <li key={tst._id}>
                          <span>{tst.name}</span>
                          <span>Rs. {Number(tst.price || 0)}</span>
                        </li>
                      ))}
                    </ul>

                    {testsInProfile.length > VISIBLE_TESTS_IN_PROFILE && (
                      <div style={{ marginTop: 8 }}>
                        <button
                          type="button"
                          className={expanded ? styles.cancelButton : styles.formButton}
                          onClick={() => setProfileExpandedTests(prev => ({ ...prev, [profile._id]: !expanded }))}
                        >
                          {expanded ? 'View less tests' : `View more tests (${testsInProfile.length - VISIBLE_TESTS_IN_PROFILE} more)`}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className={styles.cardFooter}>
                    <div style={{ color: '#6c757d', fontWeight: 700 }}>
                      Total Save: Rs. {savings}
                    </div>

                    <Link to="/book-appointment" state={{ selectedProfile: profile }} className={styles.bookButton}>
                      Book Profile
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {profiles.length > VISIBLE_PROFILE_COUNT && (
            <div style={{ marginTop: 12, textAlign: 'center' }}>
              <button
                type="button"
                className={showAllProfiles ? styles.cancelButton : styles.formButton}
                onClick={() => setShowAllProfiles(prev => !prev)}
              >
                {showAllProfiles ? 'View less profiles' : `View more profiles (${profiles.length - VISIBLE_PROFILE_COUNT} more)`}
              </button>
            </div>
          )}
        </section>
      )}

      {/* Individual Tests Section */}
      {activeSection === 'tests' && (
        <section className={styles.section} style={{ marginTop: 18 }}>
          <h2 className={styles.sectionTitle}>Individual Tests</h2>

          <div className={styles.tableContainer}>
            <table className={styles.testTable}>
              <thead>
                <tr>
                  <th>Test Name</th>
                  <th>Price</th>
                  <th style={{ width: 170 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleTests.map(test => (
                  <React.Fragment key={test._id}>
                    <tr>
                      <td>{test.name}</td>
                      <td>Rs. {Number(test.price || 0)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Link to="/book-appointment" state={{ selectedTests: [test] }} className={styles.bookButtonSmall}>
                            Book
                          </Link>
                          <button
                            type="button"
                            className={styles.editButton}
                            onClick={() =>
                              setExpandedTestId(prev => prev === test._id ? null : test._id)
                            }
                          >
                            {expandedTestId === test._id ? "Hide" : "View"}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {expandedTestId === test._id && (
                      <tr>
                        <td colSpan="3">
                          <div style={{ background: "#f9f9ff", padding: "12px 16px", borderRadius: 8, marginTop: 6 }}>
                            <p style={{ margin: 0, color: "#444" }}>
                              <strong>Description:</strong> {test.description || "No description available."}
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}

                {!showAllTests && individualTests.length > VISIBLE_TEST_COUNT && (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', padding: '18px 12px' }}>
                      <button
                        type="button"
                        className={styles.formButton}
                        onClick={() => setShowAllTests(true)}
                      >
                        View more tests ({individualTests.length - VISIBLE_TEST_COUNT} more)
                      </button>
                    </td>
                  </tr>
                )}

                {showAllTests && individualTests.length > VISIBLE_TEST_COUNT && (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', padding: '18px 12px' }}>
                      <button
                        type="button"
                        className={styles.cancelButton}
                        onClick={() => setShowAllTests(false)}
                      >
                        View less
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}

export default ExploreTests;
