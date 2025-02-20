# Firebay Studios Backend

Welcome to the backend repository of Firebay Studios!

## Rules:

- **No OOP**: Strictly avoid using Object-Oriented Programming principles.
- **Avoid Relative Imports**: Do not use relative imports with `__init__.py` files; refrain from converting folders into modules.
- **Pytest Files**: Locate pytest files directly next to the actual file that is being tested.
- **Containerized Coding**: Execute code inside of the container, and deployment will be managed externally by GitHub Actions.

## Project Structure:

Our structure is as follows:
- Source code files and their corresponding test files are placed next to each other.
- Test files are prefixed with `test_` followed by the name of the file they are testing.

```
.
├── Dockerfile
├── ...
├── flask_api.py
├── test_flask_api.py
├── utils.py
├── test_utils.py
└── ...
```

## CI/CD Pipeline with GitHub Actions

We utilize GitHub Actions to manage our continuous integration and continuous delivery (CI/CD) pipeline, ensuring code quality and automated deployment.

### Test Suite Execution

- **On Pull Request**:
  - Whenever a **new pull request** is opened targeting the `main` branch, or any **new commits** are pushed to an existing pull request, the test suite is triggered.
  - **Action**: Only the unit tests are executed using `pytest` to validate the new changes. The build and deployment processes are **not** triggered at this stage.
  - **Purpose**: This ensures that all proposed changes are validated against the existing codebase to maintain code quality and functionality.

### Build and Deployment

- **On Merge to Main**:
  - When a pull request is **successfully merged** into the `main` branch (presuming all tests have passed during the pull request phase), the subsequent steps of the CI/CD pipeline are triggered.
  - **Action**: 
    1. **Build**: A Docker image is built and pushed to AWS ECR.
    2. **Deploy**: The Docker image is deployed to AWS Elastic Beanstalk.
  - **Purpose**: This ensures the new changes are propagated into the production environment, making the verified updates accessible in the live application.


## Workflow Visualization:

1. **Test**: Ensure code quality through running unit tests.
2. **Build and Push Docker**: Create a Docker image and push it to ECR.
3. **Deploy**: Deploy the application to AWS Elastic Beanstalk.

```yaml
jobs:
  test:
    # Run unit tests using pytest
    
  build-and-push-docker:
    needs: test  # Depends on successful completion of 'test' job
    
  deploy-to-beanstalk:
    needs: build-and-push-docker  # Depends on successful completion of 'build-and-push-docker' job
```

## Key Files & Their Purposes:

- `.github/workflows/your_workflow.yml`: Defines the entire CI/CD process, including test execution, Docker build and push, and deployment.
- `Dockerfile`: Contains instructions to Docker for building the image.
- `requirements.txt`: Lists all Python dependencies required to run the application and tests.
- `pytest.ini`: Pytest ignore files.
