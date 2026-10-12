// The chibi figures from the concept art, built from simple shapes.
import { useEffect, useState } from 'react';

// Glossy vinyl-toy finish, like the concept art figures.
export function mat(color, opts = {}) {
  return <meshPhysicalMaterial color={color} roughness={0.5} clearcoat={0.55} clearcoatRoughness={0.35} envMapIntensity={0.8} {...opts} />;
}

function Hair({ look }) {
  const c = look.hairColor;
  switch (look.hair) {
    case 'slick':
      return (
        <group>
          <mesh position={[0, 0.16, -0.04]} scale={[1.04, 0.8, 1.04]} castShadow>
            <sphereGeometry args={[0.46, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />{mat(c)}
          </mesh>
          <mesh position={[0.12, 0.5, 0.2]} rotation={[0.5, 0, -0.3]} scale={[1.4, 0.55, 0.9]} castShadow>
            <sphereGeometry args={[0.16, 12, 10]} />{mat(c)}
          </mesh>
        </group>
      );
    case 'side':
      return (
        <group>
          <mesh position={[0, 0.14, -0.03]} scale={[1.05, 0.78, 1.05]} castShadow>
            <sphereGeometry args={[0.46, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />{mat(c)}
          </mesh>
          <mesh position={[-0.12, 0.44, 0.24]} rotation={[0.3, 0, 0.5]} scale={[1.6, 0.45, 0.8]} castShadow>
            <sphereGeometry args={[0.15, 12, 10]} />{mat(c)}
          </mesh>
        </group>
      );
    case 'messy':
    case 'curly':
      return (
        <group>
          <mesh position={[0, 0.14, -0.03]} scale={[1.06, 0.82, 1.06]} castShadow>
            <sphereGeometry args={[0.47, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />{mat(c)}
          </mesh>
          {[[-0.2, 0.5, 0.15], [0.05, 0.56, 0.18], [0.25, 0.48, 0.1], [-0.05, 0.52, -0.15], [0.3, 0.38, -0.12], [-0.32, 0.36, 0]].map((p, i) => (
            <mesh key={i} position={p} castShadow>
              <sphereGeometry args={[look.hair === 'curly' ? 0.13 : 0.15, 10, 8]} />{mat(c)}
            </mesh>
          ))}
        </group>
      );
    case 'long':
      return (
        <group>
          <mesh position={[0, 0.12, -0.02]} scale={[1.07, 0.85, 1.07]} castShadow>
            <sphereGeometry args={[0.47, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />{mat(c)}
          </mesh>
          <mesh position={[0, -0.32, -0.16]} castShadow>
            <boxGeometry args={[0.98, 1.05, 0.5]} />{mat(c)}
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[0.43 * s, -0.25, 0.12]} castShadow>
              <boxGeometry args={[0.13, 1.0, 0.3]} />{mat(c)}
            </mesh>
          ))}
        </group>
      );
    case 'bob':
      return (
        <group>
          <mesh position={[0, 0.1, -0.02]} scale={[1.1, 0.95, 1.08]} castShadow>
            <sphereGeometry args={[0.47, 24, 16, 0, Math.PI * 2, 0, Math.PI / 1.65]} />{mat(c)}
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[0.42 * s, -0.12, 0.05]} castShadow>
              <boxGeometry args={[0.16, 0.5, 0.62]} />{mat(c)}
            </mesh>
          ))}
        </group>
      );
    case 'cap':
      return (
        <group>
          <mesh position={[0, 0.1, -0.03]} scale={[1.05, 0.7, 1.05]} castShadow>
            <sphereGeometry args={[0.46, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />{mat(c)}
          </mesh>
          <mesh position={[0, 0.2, 0]} scale={[1.08, 0.78, 1.08]} castShadow>
            <sphereGeometry args={[0.46, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />{mat(look.cap)}
          </mesh>
          <mesh position={[0, 0.24, 0.42]} rotation={[0.25, 0, 0]} castShadow>
            <boxGeometry args={[0.62, 0.05, 0.36]} />{mat(look.cap)}
          </mesh>
          <mesh position={[0, 0.46, 0.33]} rotation={[0.9, 0, 0]}>
            <circleGeometry args={[0.12, 16]} />{mat('#ffffff')}
          </mesh>
        </group>
      );
    default:
      return null;
  }
}

function Face({ look, blink }) {
  const eyeY = 0.0;
  const z = 0.43;
  const happy = look.eyes === 'happy';
  return (
    <group>
      {[-1, 1].map((s) => (
        <group key={s} position={[0.16 * s, eyeY, z]}>
          {happy ? (
            <mesh rotation={[0, 0, 0]}>
              <torusGeometry args={[0.06, 0.016, 6, 12, Math.PI]} />{mat('#1a1a1a')}
            </mesh>
          ) : (
            <mesh scale={[1, blink ? 0.12 : look.eyes === 'half' ? 0.75 : 1, 1]}>
              <sphereGeometry args={[0.065, 12, 10]} />{mat('#141414', { roughness: 0.3 })}
            </mesh>
          )}
          {!happy && !blink && (
            <mesh position={[0.02 * s, 0.025, 0.05]}>
              <sphereGeometry args={[0.018, 6, 6]} />{mat('#ffffff')}
            </mesh>
          )}
          {/* brow */}
          <mesh position={[0, 0.13, -0.01]} rotation={[0, 0, look.eyes === 'stern' ? -0.35 * s : look.eyes === 'sly' ? 0.15 * s : 0]}>
            <boxGeometry args={[0.15, 0.03, 0.02]} />{mat(look.hairColor || '#4a3020')}
          </mesh>
        </group>
      ))}
      {/* mouth */}
      {look.eyes === 'stern' || look.eyes === 'half' ? (
        <mesh position={[0, -0.18, z - 0.01]}>
          <boxGeometry args={[0.08, 0.018, 0.01]} />{mat('#5a3328')}
        </mesh>
      ) : (
        <mesh position={[0, -0.16, z - 0.02]} rotation={[0, 0, Math.PI]}>
          <torusGeometry args={[0.05, 0.012, 6, 12, Math.PI]} />{mat('#5a3328')}
        </mesh>
      )}
      {look.glasses &&
        [-1, 1].map((s) => (
          <mesh key={s} position={[0.16 * s, eyeY, z + 0.03]}>
            <torusGeometry args={[0.11, 0.02, 8, 24]} />{mat('#111')}
          </mesh>
        ))}
      {/* cheeks */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0.27 * s, -0.1, 0.36]}>
          <sphereGeometry args={[0.05, 8, 8]} />{mat('#f3a6a0', { transparent: true, opacity: 0.35 })}
        </mesh>
      ))}
    </group>
  );
}

function Body({ look, armsRef, legsRef }) {
  return (
    <group>
      {/* torso */}
      <mesh position={[0, 0.62, 0]} castShadow>
        <capsuleGeometry args={[look.robe ? 0.36 : 0.32, 0.32, 6, 16]} />{mat(look.top)}
      </mesh>
      {look.robe && (
        <mesh position={[0, 0.3, 0]} castShadow>
          <cylinderGeometry args={[0.36, 0.44, 0.5, 18]} />{mat(look.top)}
        </mesh>
      )}
      {/* shirt + tie */}
      {!look.robe && look.shirt !== look.top && (
        <mesh position={[0, 0.82, 0.24]} rotation={[0.3, 0, 0]}>
          <boxGeometry args={[0.2, 0.22, 0.05]} />{mat(look.shirt)}
        </mesh>
      )}
      {look.tie && (
        <mesh position={[0, 0.68, 0.315]} rotation={[0.12, 0, 0]}>
          <boxGeometry args={[0.07, 0.32, 0.02]} />{mat(look.tie)}
        </mesh>
      )}
      {look.beads && (
        <group position={[0, 0.82, 0.04]} rotation={[0.35, 0, 0]}>
          {Array.from({ length: 16 }).map((_, i) => {
            const a = (i / 16) * Math.PI * 2;
            return (
              <mesh key={i} position={[Math.sin(a) * 0.3, Math.cos(a) * 0.16 - 0.05, Math.cos(a) * 0.2 + 0.08]}>
                <sphereGeometry args={[0.04, 8, 6]} />{mat(look.beads, { roughness: 0.4 })}
              </mesh>
            );
          })}
        </group>
      )}
      {/* arms */}
      <group ref={armsRef}>
        {[-1, 1].map((s) => (
          <group key={s} position={[0.38 * s, 0.82, 0]} name={s < 0 ? 'armL' : 'armR'}>
            <mesh position={[0, -0.2, 0]} castShadow>
              <capsuleGeometry args={[0.085, 0.25, 4, 10]} />{mat(look.top)}
            </mesh>
            <mesh position={[0, -0.42, 0]}>
              <sphereGeometry args={[0.085, 10, 8]} />{mat(look.skin)}
            </mesh>
          </group>
        ))}
      </group>
      {/* legs */}
      <group ref={legsRef}>
        {[-1, 1].map((s) => (
          <group key={s} position={[0.14 * s, 0.3, 0]} name={s < 0 ? 'legL' : 'legR'}>
            {!look.robe && (
              <mesh position={[0, -0.12, 0]} castShadow>
                <cylinderGeometry args={[0.11, 0.1, 0.28, 10]} />{mat(look.pants)}
              </mesh>
            )}
            <mesh position={[0, -0.26, 0.05]} castShadow>
              <boxGeometry args={[0.18, 0.09, 0.28]} />{mat(look.hair === 'curly' ? '#f4f4f4' : '#141416', { roughness: 0.4 })}
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

function Headphones({ color }) {
  return (
    <group>
      <mesh position={[0, 0.06, 0]}>
        <torusGeometry args={[0.5, 0.035, 8, 24, Math.PI]} />{mat(color === '#f4f4f4' ? '#f4f4f4' : '#1d1d22')}
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0.47 * s, 0.0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.14, 0.14, 0.12, 16]} />{mat(color)}
        </mesh>
      ))}
    </group>
  );
}


/** A whole figure. Refs let the caller animate the body, arms and legs. */
export function Chibi({ look, bodyRef, armsRef, legsRef }) {
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    let t;
    const b = setInterval(() => {
      setBlink(true);
      t = setTimeout(() => setBlink(false), 140);
    }, 2800 + Math.random() * 2500);
    return () => { clearInterval(b); clearTimeout(t); };
  }, []);
  return (
    <group ref={bodyRef} scale={1.15}>
      <Body look={look} armsRef={armsRef} legsRef={legsRef} />
      <group position={[0, 1.38, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.45, 32, 24]} />{mat(look.skin)}
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[0.44 * s, -0.02, 0]}>
            <sphereGeometry args={[0.08, 10, 8]} />{mat(look.skin)}
          </mesh>
        ))}
        <Face look={look} blink={blink} />
        <Hair look={look} />
        {look.headphones && <Headphones color={look.headphones} />}
      </group>
    </group>
  );
}
