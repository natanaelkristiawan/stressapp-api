#!/bin/sh
ENV=$1
PROJECT_NAME=$2
PACKAGE_VERSION=$3
REGION=$4
ARN_NUMBER=$5


echo "===========ARGUMENT========="
echo "ENV:" ${ENV}
echo "PROJECT_NAME:" ${PROJECT_NAME}
echo "PACKAGE_VERSION:" ${PACKAGE_VERSION}
echo "AWS REGION:" ${REGION}
echo "AWS ARN_NUMBER" ${ARN_NUMBER}
echo "============================"


echo "building image version" $ENV-$PACKAGE_VERSION

docker build --build-arg NODE_ENV=$ENV \
    --build-arg=LAST_COMMIT="$LAST_COMMIT" \
    --build-arg=PACKAGE_VERSION="$PACKAGE_VERSION" \
    -t $PROJECT_NAME:$ENV-$PACKAGE_VERSION -f ./Dockerfile .
aws ecr get-login-password --region ap-southeast-3 | docker login --username AWS --password-stdin ${ARN_NUMBER}.dkr.ecr.${REGION}.amazonaws.com
aws ecr create-repository \
    --repository-name ${PROJECT_NAME} \
    --region ${REGION}
docker tag $PROJECT_NAME:$ENV-$PACKAGE_VERSION ${ARN_NUMBER}.dkr.ecr.${REGION}.amazonaws.com/$PROJECT_NAME:$ENV-$PACKAGE_VERSION
docker push ${ARN_NUMBER}.dkr.ecr.${REGION}.amazonaws.com/$PROJECT_NAME:$ENV-$PACKAGE_VERSION
#docker images -a |  grep "${PROJECT_NAME}[[:space:]]*${ENV}-${PACKAGE_VERSION}" | awk '{print $3}' | xargs docker rmi -f
