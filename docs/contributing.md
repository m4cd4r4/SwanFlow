# Contributing to Perth Traffic Watch

Thank you for your interest in contributing! This project is open-source and welcomes contributions from the community.

## Ways to Contribute

### 1. Code Contributions
- Firmware improvements (ESP32-CAM)
- Backend API enhancements
- Frontend dashboard features
- Bug fixes
- Performance optimisations

### 2. Documentation
- Installation guides
- Troubleshooting tips
- Video tutorials
- Translations

### 3. Hardware
- Alternative component recommendations
- PCB designs
- 3D-printed enclosures
- Solar power optimisations

### 4. Machine Learning
- Improved FOMO models
- Multi-class detection (cars, trucks, motorcycles)
- Direction detection algorithms
- Speed estimation

### 5. Testing
- Field testing at different locations
- Weather condition testing
- Long-term reliability testing
- Accuracy validation

### 6. Community
- Answer questions in discussions
- Share deployment stories
- Write blog posts
- Speak at meetups/conferences

## Getting Started

### 1. Fork the Repository

```bash
git clone https://github.com/your-username/perth-traffic-watch.git
cd perth-traffic-watch
```

### 2. Create a Branch

```bash
git checkout -b feature/your-feature-name
```

Branch naming:
- `feature/` - New features
- `bugfix/` - Bug fixes
- `docs/` - Documentation
- `refactor/` - Code refactoring

### 3. Make Changes

Follow coding standards:
- **Firmware (C/C++)**:
  - 2-space indentation
  - Descriptive variable names
  - Comments for complex logic
- **Backend (JavaScript)**:
  - 2-space indentation
  - ESLint recommended
  - Use modern ES6+ syntax
- **Frontend (HTML/CSS/JS)**:
  - 2-space indentation
  - Mobile-first responsive design

### 4. Test Your Changes

**Firmware**:
```bash
cd firmware/esp32-cam-counter
pio run
pio test
```

**Backend**:
```bash
cd backend/api
npm install
npm test  # (when tests are implemented)
```

**Frontend**:
- Test in Chrome, Firefox, Safari
- Test on mobile devices
- Verify responsiveness

### 5. Commit Your Changes

Use clear commit messages:
```bash
git add .
git commit -m "Add feature: real-time WebSocket updates"
```

Commit message format:
```
<type>: <subject>

<body (optional)>

<footer (optional)>
```

Types:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `style:` - Formatting, no code change
- `refactor:` - Code restructuring
- `test:` - Adding tests
- `chore:` - Maintenance

### 6. Push to GitHub

```bash
git push origin feature/your-feature-name
```

### 7. Create a Pull Request

1. Go to GitHub repository
2. Click "New Pull Request"
3. Select your branch
4. Fill in PR template:
   - **Description**: What does this PR do?
   - **Motivation**: Why is this change needed?
   - **Testing**: How did you test this?
   - **Screenshots**: (if UI change)

## Code Review Process

1. **Automated Checks**: CI/CD runs tests (when implemented)
2. **Peer Review**: Maintainer reviews code
3. **Feedback**: Address review comments
4. **Approval**: Once approved, PR is merged
5. **Release**: Changes included in next release

## Coding Standards

### Firmware (C/C++)

```cpp
// Good: Descriptive names, comments for complex logic
void detectVehicles(camera_fb_t* frameBuffer) {
  // Run FOMO inference on frame buffer
  int vehicleCount = runInference(frameBuffer);

  if (vehicleCount > 0) {
    Serial.printf("Detected %d vehicles\n", vehicleCount);
  }
}

// Bad: Unclear names, no comments
void dv(camera_fb_t* fb) {
  int vc = ri(fb);
  if (vc > 0) Serial.printf("%d\n", vc);
}
```

### Backend (JavaScript)

```javascript
// Good: Async/await, error handling
async function fetchStats(site, period) {
  try {
    const response = await fetch(`/api/stats/${site}?period=${period}`);
    const data = await response.json();
    return data.stats;
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    return null;
  }
}

// Bad: Callback hell, no error handling
function fetchStats(site, period, callback) {
  fetch(`/api/stats/${site}?period=${period}`)
    .then(r => r.json())
    .then(d => callback(d.stats));
}
```

### Frontend (JavaScript)

```javascript
// Good: Clear function names, consistent formatting
function updateStatsCards(stats) {
  document.getElementById('total-count').textContent =
    stats.totalCount?.toLocaleString() || '-';

  document.getElementById('avg-hourly').textContent =
    stats.avgHourly ? Math.round(stats.avgHourly) : '-';
}

// Bad: Unclear, inconsistent
function u(s) {
  document.getElementById('total-count').textContent=s.totalCount?.toLocaleString()||'-';
  document.getElementById('avg-hourly').textContent=s.avgHourly?Math.round(s.avgHourly):'-';}
```

## Documentation Standards

- Use **Australian English** (analyse, optimise, colour, etc.)
- Include code examples
- Provide screenshots for UI features
- Update README.md if adding major features
- Add comments for complex algorithms

## Testing

### Unit Tests (Future)

```javascript
// Example: backend API tests
describe('Detection API', () => {
  test('POST /api/detections creates record', async () => {
    const response = await request(app)
      .post('/api/detections')
      .set('Authorization', 'Bearer test_key')
      .send({
        site: 'Test Site',
        timestamp: Date.now(),
        total_count: 42
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });
});
```

### Integration Tests

- Deploy to test site
- Run for 24 hours
- Compare automated count to manual count
- Verify accuracy >70%

## Reporting Bugs

### Before Submitting

- Check existing issues
- Try latest version
- Collect diagnostic info:
  - ESP32 serial output
  - Backend API logs
  - Browser console errors

### Bug Report Template

```markdown
**Description**
A clear description of the bug.

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behaviour**
What should happen.

**Actual Behaviour**
What actually happens.

**Environment**
- Hardware: ESP32-CAM AI-Thinker
- Firmware version: v1.0
- Backend: Express v4.18
- Browser: Chrome 120

**Logs**
```
Paste relevant logs here
```

**Screenshots**
If applicable.
```

## Feature Requests

We welcome feature ideas! Open an issue with:
- **Use case**: What problem does this solve?
- **Proposed solution**: How would it work?
- **Alternatives**: Other approaches considered?
- **Mockups**: UI designs (if applicable)

## Community Guidelines

### Be Respectful
- Treat everyone with respect
- No harassment, discrimination, or offensive language
- Assume good intent

### Be Helpful
- Answer questions kindly
- Share knowledge
- Mentor new contributors

### Be Patient
- Maintainers are volunteers
- Response times vary
- Follow up politely if no response after 1 week

## Recognition

Contributors are recognised in:
- README.md (Contributors section)
- Release notes
- Project website (when available)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

- **GitHub Discussions**: https://github.com/m4cd4r4/perth-traffic-watch/discussions
- **Email**: contact@perth-traffic-watch.com (TBD)
- **Unif-eye Brain**: Report insights to https://unif-eye.vercel.app/api/donnacha/brain

## Maintainers

- **Macdara** ([@m4cd4r4](https://github.com/m4cd4r4)) - Project creator

Interested in becoming a maintainer? Contribute regularly and ask!

---

**Thank you for contributing to Perth Traffic Watch!** 🚗📊

Together, we're building open-source traffic monitoring for everyone.
