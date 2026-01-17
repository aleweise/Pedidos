# Guía Completa de CI/CD 2025
## Continuous Integration & Continuous Deployment

## Tabla de Contenidos
1. [Fundamentos de CI/CD](#fundamentos-de-cicd)
2. [GitHub Actions](#github-actions)
3. [GitLab CI/CD](#gitlab-cicd)
4. [Estrategias de Deployment](#estrategias-de-deployment)
5. [Testing en CI/CD](#testing-en-cicd)
6. [Security y Compliance](#security-y-compliance)
7. [Monitoreo y Rollbacks](#monitoreo-y-rollbacks)
8. [Optimización de Pipelines](#optimización-de-pipelines)
9. [Multi-Environment](#multi-environment)
10. [Best Practices](#best-practices)

---

## Fundamentos de CI/CD

### ¿Qué es CI/CD?

**Continuous Integration (CI)**
- Integración automática de código en repositorio compartido
- Tests automáticos en cada commit/PR
- Build y validación continua
- Detección temprana de errores

**Continuous Deployment (CD)**
- Despliegue automático a producción
- Release automático después de pasar tests
- Zero-downtime deployments
- Rollback automático en caso de fallo

### Pipeline Ideal

```
┌─────────────┐
│   Commit    │
└──────┬──────┘
       │
       v
┌─────────────┐
│  Lint/Format│  ← Code Quality
└──────┬──────┘
       │
       v
┌─────────────┐
│ Unit Tests  │  ← Fast tests
└──────┬──────┘
       │
       v
┌─────────────┐
│    Build    │  ← Compile/Bundle
└──────┬──────┘
       │
       v
┌─────────────┐
│ Integration │  ← API/DB tests
│    Tests    │
└──────┬──────┘
       │
       v
┌─────────────┐
│  Security   │  ← Vulnerability scan
│    Scan     │
└──────┬──────┘
       │
       v
┌─────────────┐
│   Deploy    │  ← Staging/Prod
│  Staging    │
└──────┬──────┘
       │
       v
┌─────────────┐
│  E2E Tests  │  ← Full flow tests
└──────┬──────┘
       │
       v
┌─────────────┐
│   Deploy    │  ← Production
│ Production  │
└─────────────┘
```

---

## GitHub Actions

### Estructura Básica

```yaml
# .github/workflows/ci.yml
name: CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '18'

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Lint
        run: npm run lint
      
      - name: Format check
        run: npm run format:check

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
          flags: unittests

  build:
    needs: [lint, test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build
          path: dist/
```

### Pipeline Completo con Deploy

```yaml
# .github/workflows/deploy.yml
name: Deploy Pipeline

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run migrations
        run: npm run migrate
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
      
      - name: Run tests
        run: npm run test:all
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
          REDIS_URL: redis://localhost:6379

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
      
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'
      
      - name: Upload Trivy results to GitHub Security
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'

  build-and-push:
    needs: [test, security]
    runs-on: ubuntu-latest
    outputs:
      image-tag: ${{ steps.meta.outputs.tags }}
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Login to DockerHub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}
      
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: myorg/myapp
          tags: |
            type=sha,prefix={{branch}}-
            type=semver,pattern={{version}}
            type=raw,value=latest,enable={{is_default_branch}}
      
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy-staging:
    needs: build-and-push
    runs-on: ubuntu-latest
    environment:
      name: staging
      url: https://staging.myapp.com
    
    steps:
      - name: Deploy to Kubernetes Staging
        uses: azure/k8s-deploy@v4
        with:
          manifests: |
            k8s/deployment.yaml
            k8s/service.yaml
          images: ${{ needs.build-and-push.outputs.image-tag }}
          namespace: staging

  e2e-tests:
    needs: deploy-staging
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          BASE_URL: https://staging.myapp.com
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/

  deploy-production:
    needs: e2e-tests
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://myapp.com
    
    steps:
      - name: Deploy to Production
        uses: azure/k8s-deploy@v4
        with:
          manifests: |
            k8s/deployment.yaml
            k8s/service.yaml
          images: ${{ needs.build-and-push.outputs.image-tag }}
          namespace: production
      
      - name: Notify Slack
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "🚀 Deployment to production successful!",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "Deployment completed for commit ${{ github.sha }}"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

### Reusable Workflows

```yaml
# .github/workflows/reusable-test.yml
name: Reusable Test Workflow

on:
  workflow_call:
    inputs:
      node-version:
        required: true
        type: string
      environment:
        required: true
        type: string
    secrets:
      DATABASE_URL:
        required: true

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ inputs.node-version }}
      
      - run: npm ci
      - run: npm test
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          NODE_ENV: ${{ inputs.environment }}

# Uso en otro workflow
# .github/workflows/main.yml
jobs:
  test-staging:
    uses: ./.github/workflows/reusable-test.yml
    with:
      node-version: '18'
      environment: 'staging'
    secrets:
      DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}
```

### Caching Estratégico

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      # Cache de dependencias
      - name: Cache node modules
        uses: actions/cache@v3
        with:
          path: |
            ~/.npm
            node_modules
          key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-node-
      
      # Cache de build
      - name: Cache build output
        uses: actions/cache@v3
        with:
          path: dist
          key: ${{ runner.os }}-build-${{ github.sha }}
      
      # Docker layer caching
      - name: Build Docker image
        uses: docker/build-push-action@v5
        with:
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

### Matrix Strategy

```yaml
jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        node-version: [16, 18, 20]
        exclude:
          - os: macos-latest
            node-version: 16
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      
      - run: npm ci
      - run: npm test
```

---

## GitLab CI/CD

### Pipeline Completo

```yaml
# .gitlab-ci.yml
stages:
  - lint
  - test
  - build
  - security
  - deploy-staging
  - e2e
  - deploy-production

variables:
  DOCKER_DRIVER: overlay2
  DOCKER_TLS_CERTDIR: "/certs"
  NODE_VERSION: "18"

# Templates reutilizables
.node_template: &node_template
  image: node:${NODE_VERSION}
  cache:
    key:
      files:
        - package-lock.json
    paths:
      - node_modules/
      - .npm/
  before_script:
    - npm ci --cache .npm --prefer-offline

# Jobs
lint:
  <<: *node_template
  stage: lint
  script:
    - npm run lint
    - npm run format:check
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH

unit-tests:
  <<: *node_template
  stage: test
  script:
    - npm run test:unit -- --coverage
  coverage: '/Lines\s*:\s*(\d+\.\d+)%/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
    paths:
      - coverage/

integration-tests:
  <<: *node_template
  stage: test
  services:
    - postgres:15
    - redis:7
  variables:
    POSTGRES_DB: test
    POSTGRES_USER: test
    POSTGRES_PASSWORD: test
    DATABASE_URL: postgresql://test:test@postgres:5432/test
    REDIS_URL: redis://redis:6379
  script:
    - npm run migrate
    - npm run test:integration
  artifacts:
    reports:
      junit: junit.xml

build:
  <<: *node_template
  stage: build
  script:
    - npm run build
  artifacts:
    paths:
      - dist/
    expire_in: 1 week
  only:
    - main
    - develop

security-scan:
  stage: security
  image: aquasec/trivy:latest
  script:
    - trivy fs --exit-code 1 --severity CRITICAL,HIGH .
  allow_failure: true

sast:
  stage: security
  image: returntocorp/semgrep
  script:
    - semgrep --config=auto --json --output=semgrep-results.json .
  artifacts:
    reports:
      sast: semgrep-results.json

build-docker:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker tag $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA $CI_REGISTRY_IMAGE:latest
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
    - docker push $CI_REGISTRY_IMAGE:latest
  only:
    - main

deploy-staging:
  stage: deploy-staging
  image: bitnami/kubectl:latest
  environment:
    name: staging
    url: https://staging.myapp.com
    on_stop: stop-staging
  before_script:
    - kubectl config use-context staging
  script:
    - kubectl set image deployment/myapp myapp=$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA -n staging
    - kubectl rollout status deployment/myapp -n staging
  only:
    - main

stop-staging:
  stage: deploy-staging
  image: bitnami/kubectl:latest
  when: manual
  environment:
    name: staging
    action: stop
  script:
    - kubectl delete deployment myapp -n staging

e2e-tests:
  <<: *node_template
  stage: e2e
  script:
    - npx playwright install --with-deps
    - npm run test:e2e
  environment:
    name: staging
  artifacts:
    when: always
    paths:
      - playwright-report/
    expire_in: 30 days
  only:
    - main

deploy-production:
  stage: deploy-production
  image: bitnami/kubectl:latest
  environment:
    name: production
    url: https://myapp.com
  before_script:
    - kubectl config use-context production
  script:
    - kubectl set image deployment/myapp myapp=$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA -n production
    - kubectl rollout status deployment/myapp -n production
  when: manual
  only:
    - main
  needs:
    - e2e-tests
```

### Dynamic Environments

```yaml
deploy-review:
  stage: deploy
  script:
    - echo "Deploying to review environment"
    - ./deploy-review.sh $CI_COMMIT_REF_SLUG
  environment:
    name: review/$CI_COMMIT_REF_SLUG
    url: https://$CI_COMMIT_REF_SLUG.review.myapp.com
    on_stop: stop-review
    auto_stop_in: 1 week
  only:
    - merge_requests

stop-review:
  stage: deploy
  script:
    - ./cleanup-review.sh $CI_COMMIT_REF_SLUG
  environment:
    name: review/$CI_COMMIT_REF_SLUG
    action: stop
  when: manual
  only:
    - merge_requests
```

---

## Estrategias de Deployment

### Blue-Green Deployment

```yaml
# GitHub Actions
jobs:
  deploy-blue-green:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Blue
        run: |
          kubectl apply -f k8s/deployment-blue.yaml
          kubectl rollout status deployment/myapp-blue
      
      - name: Run smoke tests
        run: npm run test:smoke -- --url=https://blue.myapp.com
      
      - name: Switch traffic to Blue
        run: |
          kubectl patch service myapp -p '{"spec":{"selector":{"version":"blue"}}}'
      
      - name: Wait and monitor
        run: sleep 300  # 5 minutos de monitoreo
      
      - name: Scale down Green
        run: kubectl scale deployment myapp-green --replicas=0
```

### Canary Deployment

```yaml
# GitLab CI
deploy-canary:
  stage: deploy
  script:
    # Deploy canary con 10% del tráfico
    - kubectl apply -f k8s/deployment-canary.yaml
    - kubectl set image deployment/myapp-canary myapp=$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
    
    # Configurar Istio para 10% de tráfico
    - |
      cat <<EOF | kubectl apply -f -
      apiVersion: networking.istio.io/v1beta1
      kind: VirtualService
      metadata:
        name: myapp
      spec:
        hosts:
        - myapp.com
        http:
        - match:
          - headers:
              canary:
                exact: "true"
          route:
          - destination:
              host: myapp
              subset: canary
        - route:
          - destination:
              host: myapp
              subset: stable
            weight: 90
          - destination:
              host: myapp
              subset: canary
            weight: 10
      EOF
  environment:
    name: production-canary

promote-canary:
  stage: deploy
  when: manual
  script:
    # Promover canary a stable
    - kubectl set image deployment/myapp myapp=$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
    - kubectl rollout status deployment/myapp
    
    # Remover canary deployment
    - kubectl delete deployment myapp-canary
  environment:
    name: production
```

### Rolling Update

```yaml
# Kubernetes deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 10
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 2        # Máximo 2 pods extra durante update
      maxUnavailable: 1   # Máximo 1 pod no disponible
  template:
    spec:
      containers:
      - name: myapp
        image: myapp:latest
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 15
          periodSeconds: 10
```

---

## Testing en CI/CD

### Test Pyramid en CI

```yaml
# .github/workflows/test.yml
jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:unit
        timeout-minutes: 5  # Tests rápidos

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
      redis:
        image: redis:7
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:integration
        timeout-minutes: 15

  e2e-tests:
    needs: [unit-tests, integration-tests]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:e2e
        timeout-minutes: 30  # Tests más lentos
```

### Parallel Testing

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shard: [1, 2, 3, 4]  # 4 shards paralelos
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test -- --shard=${{ matrix.shard }}/4
```

### Contract Testing

```yaml
# Pact contract testing
contract-test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
    - run: npm ci
    
    # Consumer tests
    - run: npm run test:pact:consumer
    
    # Publish contracts
    - run: |
        npx pact-broker publish \
          --consumer-app-version=${{ github.sha }} \
          --branch=${{ github.ref_name }} \
          pacts/

    # Provider verification
    - run: npm run test:pact:provider
```

---

## Security y Compliance

### Secret Scanning

```yaml
jobs:
  secret-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Fetch all history
      
      - name: Gitleaks scan
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      
      - name: TruffleHog scan
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.repository.default_branch }}
          head: HEAD
```

### Dependency Scanning

```yaml
jobs:
  dependency-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run Snyk
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high
      
      - name: OWASP Dependency Check
        uses: dependency-check/Dependency-Check_Action@main
        with:
          project: 'myapp'
          path: '.'
          format: 'HTML'
      
      - name: Upload results
        uses: actions/upload-artifact@v4
        with:
          name: dependency-check-report
          path: ${{ github.workspace }}/reports
```

### SAST (Static Application Security Testing)

```yaml
jobs:
  sast:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run Semgrep
        uses: returntocorp/semgrep-action@v1
        with:
          config: >-
            p/security-audit
            p/secrets
            p/owasp-top-ten
      
      - name: Run SonarCloud
        uses: SonarSource/sonarcloud-github-action@master
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
```

### Image Scanning

```yaml
jobs:
  scan-image:
    runs-on: ubuntu-latest
    steps:
      - name: Build image
        run: docker build -t myapp:${{ github.sha }} .
      
      - name: Scan with Trivy
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: myapp:${{ github.sha }}
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'
      
      - name: Upload to GitHub Security
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'
```

---

## Monitoreo y Rollbacks

### Health Checks

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy
        run: kubectl apply -f k8s/
      
      - name: Wait for rollout
        run: kubectl rollout status deployment/myapp
      
      - name: Health check
        run: |
          for i in {1..30}; do
            if curl -f https://myapp.com/health; then
              echo "Health check passed"
              exit 0
            fi
            sleep 10
          done
          echo "Health check failed"
          exit 1
      
      - name: Rollback on failure
        if: failure()
        run: kubectl rollout undo deployment/myapp
```

### Automated Rollback

```yaml
# GitLab CI
deploy:
  stage: deploy
  script:
    - kubectl apply -f k8s/deployment.yaml
    - kubectl rollout status deployment/myapp
  after_script:
    - |
      # Check error rate from monitoring
      ERROR_RATE=$(curl -s "https://prometheus/api/v1/query?query=rate(http_requests_total{status=~'5..'}[5m])" | jq -r '.data.result[0].value[1]')
      
      if (( $(echo "$ERROR_RATE > 0.05" | bc -l) )); then
        echo "Error rate too high, rolling back"
        kubectl rollout undo deployment/myapp
        exit 1
      fi
```

### Deployment Notifications

```yaml
jobs:
  notify:
    runs-on: ubuntu-latest
    if: always()
    needs: [deploy]
    steps:
      - name: Notify Slack
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "${{ needs.deploy.result == 'success' && '✅' || '❌' }} Deployment ${{ needs.deploy.result }}",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Deployment Status:* ${{ needs.deploy.result }}\n*Commit:* ${{ github.sha }}\n*Author:* ${{ github.actor }}\n*Branch:* ${{ github.ref_name }}"
                  }
                },
                {
                  "type": "actions",
                  "elements": [
                    {
                      "type": "button",
                      "text": {"type": "plain_text", "text": "View Logs"},
                      "url": "${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
                    }
                  ]
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

---

## Optimización de Pipelines

### Conditional Jobs

```yaml
jobs:
  lint:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - run: npm run lint
  
  deploy:
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - run: ./deploy.sh
```

### Path Filtering

```yaml
on:
  push:
    paths:
      - 'src/**'
      - 'package.json'
      - '.github/workflows/**'
    paths-ignore:
      - '**.md'
      - 'docs/**'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: npm run build
```

### Concurrent Job Limits

```yaml
# Cancelar jobs en progreso cuando llega nuevo commit
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

### Dependency Caching

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/