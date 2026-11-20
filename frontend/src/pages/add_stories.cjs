const fs = require('fs');
const filePath = 'C:\\Users\\user\\Downloads\\Telegram Desktop\\campmatch-complete\\frontend\\src\\pages\\ExplorePage.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const oldText = `              Swipe {unswipedCount} {unswipedCount === 1 ? 'Profile' : 'Profiles'} in Card Stack
            </button>
          )}
        </div>

        {/* Opt-in visibility notice when user hasn't joined */`;

const newText = `              Swipe {unswipedCount} {unswipedCount === 1 ? 'Profile' : 'Profiles'} in Card Stack
              </button>
            )}
          </div>

          {/* Stories Row */}
          <div style={{ marginTop: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                Stories
              </div>
              {me && me.photo_urls?.[0] && (
                <button
                  onClick={() => setShowCreateStory(true)}
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 50,
                    border: '3px solid var(--tinder-pink)',
                    background: 'var(--bg-elevated)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <img
                    src={me.photo_urls[0]}
                    alt=""
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 50,
                      objectFit: 'cover',
                      border: '2px solid #fff',
                    }}
                  />
                  <span style={{ position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 50, background: 'var(--tinder-pink)', border: '2px solid var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 900, color: '#fff' }}>
                    +
                  </span>
                </button>
              )}
            </div>
            <StoryRow
              stories={stories}
              onView={handleViewStory}
              onDelete={handleDeleteStory}
              viewerId={me.id}
            />
          </div>

        {/* Opt-in visibility notice when user hasn't joined */`;

if (content.includes(oldText)) {
  content = content.replace(oldText, newText);
  fs.writeFileSync(filePath, content);
  console.log('Successfully replaced!');
} else {
  console.log('Could not find oldText');
  const lines = content.split('\n');
  for (let i = 255; i < 265; i++) {
    console.log((i+1) + ': [' + lines[i] + ']');
  }
}
